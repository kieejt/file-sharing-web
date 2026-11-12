import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { User, toUserDTO } from '../models/User.js';
import { File } from '../models/File.js';
import { Session } from '../models/Session.js';
import { parse, escapeRegex } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';
import { currentUser, requireAdmin, requireAuth } from '../middleware/auth.js';
import { deleteUserData } from '../services/drive.js';
import { dailyActivity, kindBreakdown } from '../services/stats.js';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/overview', async (_req, res) => {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [users, activeUsers, files, storage, byKind, daily] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ lastLoginAt: { $gte: since } }),
    File.countDocuments({ trashedAt: null }),
    User.aggregate<{ used: number; quota: number }>([
      { $group: { _id: null, used: { $sum: '$storageUsed' }, quota: { $sum: '$storageQuota' } } },
    ]),
    kindBreakdown({}),
    dailyActivity({}),
  ]);
  res.json({
    counts: { users, activeUsers, files },
    storage: { used: storage[0]?.used ?? 0, allocated: storage[0]?.quota ?? 0 },
    byKind,
    daily,
  });
});

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

adminRouter.get('/users', async (req, res) => {
  const q = parse(listSchema, req.query);
  const filter = q.q
    ? { $or: [{ name: { $regex: escapeRegex(q.q), $options: 'i' } }, { email: { $regex: escapeRegex(q.q), $options: 'i' } }] }
    : {};
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    User.countDocuments(filter),
  ]);
  const counts = await File.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { userId: { $in: users.map((u) => u._id) }, trashedAt: null } },
    { $group: { _id: '$userId', n: { $sum: 1 } } },
  ]);
  const byUser = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json({
    items: users.map((u) => ({ ...toUserDTO(u), fileCount: byUser.get(u.id as string) ?? 0, lastLoginAt: u.lastLoginAt })),
    total,
    page: q.page,
    pages: Math.max(1, Math.ceil(total / q.limit)),
  });
});

const updateSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  disabled: z.boolean().optional(),
  storageQuotaMb: z.number().int().min(1).max(10_000_000).optional(),
});

adminRouter.patch('/users/:id', async (req, res) => {
  const me = currentUser(req);
  const body = parse(updateSchema, req.body);
  if (!Types.ObjectId.isValid(req.params.id)) throw notFound();
  const user = await User.findById(req.params.id);
  if (!user) throw notFound('Không tìm thấy người dùng');
  const isSelf = user._id.equals(me._id);
  if (isSelf && (body.role === 'user' || body.disabled)) throw badRequest('Bạn không thể tự hạ quyền hoặc khoá chính mình');
  if (body.role) user.role = body.role;
  if (body.disabled !== undefined) user.disabled = body.disabled;
  if (body.storageQuotaMb) user.storageQuota = body.storageQuotaMb * 1024 * 1024;
  await user.save();
  if (user.disabled) await Session.deleteMany({ userId: user._id });
  res.json({ user: toUserDTO(user) });
});

adminRouter.delete('/users/:id', async (req, res) => {
  const me = currentUser(req);
  if (!Types.ObjectId.isValid(req.params.id)) throw notFound();
  if (me._id.equals(req.params.id)) throw badRequest('Bạn không thể xoá chính mình');
  const user = await User.findById(req.params.id);
  if (!user) throw notFound('Không tìm thấy người dùng');
  await deleteUserData(user.id);
  await user.deleteOne();
  res.status(204).end();
});

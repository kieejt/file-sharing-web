import { Router, type Request } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Types } from 'mongoose';
import { ShareLink, type ShareDoc } from '../models/ShareLink.js';
import { File, type FileDoc } from '../models/File.js';
import { User } from '../models/User.js';
import { parse } from '../lib/validate.js';
import { AppError, forbidden, gone, notFound, unauthorized } from '../lib/errors.js';
import { randomShareToken, signMediaToken, signShareAccess, verifyShareAccess } from '../lib/tokens.js';
import { safeInlineType } from '../lib/fileKind.js';
import { isFreshDownload, sendStored } from '../lib/sendStored.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { unlockLimiter } from '../middleware/rateLimit.js';
import { getOwnedFile, logActivity } from '../services/drive.js';

type ShareStatus = 'active' | 'expired' | 'exhausted' | 'revoked';

function statusOf(s: ShareDoc): ShareStatus {
  if (s.revokedAt) return 'revoked';
  if (s.expiresAt && s.expiresAt.getTime() <= Date.now()) return 'expired';
  if (s.maxDownloads != null && s.downloadCount >= s.maxDownloads) return 'exhausted';
  return 'active';
}

function toShareDTO(s: ShareDoc, file?: Pick<FileDoc, 'id' | 'name' | 'kind' | 'size'> | null) {
  return {
    id: s.id as string,
    token: s.token,
    path: `/s/${s.token}`,
    // Chế độ suy ra từ mật khẩu: riêng tư = bắt buộc biết mật khẩu, công khai = ai có link cũng mở được
    access: (s.passwordHash ? 'private' : 'public') as 'private' | 'public',
    expiresAt: s.expiresAt,
    maxDownloads: s.maxDownloads,
    downloadCount: s.downloadCount,
    viewCount: s.viewCount,
    status: statusOf(s),
    createdAt: s.createdAt,
    ...(file ? { file: { id: file.id as string, name: file.name, kind: file.kind, size: file.size } } : {}),
  };
}

/* ------------------------------------------------- quản lý (chủ sở hữu) */

export const sharesRouter = Router();
sharesRouter.use(requireAuth);

const createSchema = z
  .object({
    access: z.enum(['public', 'private'], 'Hãy chọn chia sẻ công khai hoặc riêng tư'),
    expiresInHours: z.number().int().min(1).max(24 * 365).nullable().optional(),
    password: z.string().max(128).optional().nullable()
      .refine((v) => !v || v.length >= 4, 'Mật khẩu chia sẻ cần ít nhất 4 ký tự'),
    maxDownloads: z.number().int().min(1).max(100_000).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.access === 'private' && !v.password) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Link riêng tư cần mật khẩu, ít nhất 4 ký tự' });
    }
    if (v.access === 'public' && v.password) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Link công khai không dùng mật khẩu' });
    }
  });

sharesRouter.get('/shares', async (req, res) => {
  const user = currentUser(req);
  const shares = await ShareLink.find({ userId: user._id, revokedAt: null }).select('+passwordHash').sort({ createdAt: -1 }).limit(500);
  const files = await File.find({ _id: { $in: shares.map((s) => s.fileId) }, trashedAt: null }, { name: 1, kind: 1, size: 1 });
  const byId = new Map(files.map((f) => [f.id as string, f]));
  res.json({
    shares: shares.filter((s) => byId.has(String(s.fileId))).map((s) => toShareDTO(s, byId.get(String(s.fileId)))),
  });
});

sharesRouter.get('/files/:id/shares', async (req, res) => {
  const file = await getOwnedFile(currentUser(req).id, req.params.id);
  const shares = await ShareLink.find({ fileId: file._id, revokedAt: null }).select('+passwordHash').sort({ createdAt: -1 });
  res.json({ shares: shares.map((s) => toShareDTO(s)) });
});

sharesRouter.post('/files/:id/shares', async (req, res) => {
  const user = currentUser(req);
  const body = parse(createSchema, req.body ?? {});
  const file = await getOwnedFile(user.id, req.params.id);
  const share = await ShareLink.create({
    token: randomShareToken(),
    fileId: file._id,
    userId: user._id,
    passwordHash: body.password ? await bcrypt.hash(body.password, 10) : null,
    expiresAt: body.expiresInHours ? new Date(Date.now() + body.expiresInHours * 3_600_000) : null,
    maxDownloads: body.maxDownloads ?? null,
  });
  res.status(201).json({ share: toShareDTO(share) });
});

sharesRouter.delete('/shares/:id', async (req, res) => {
  const user = currentUser(req);
  if (!Types.ObjectId.isValid(req.params.id)) throw notFound();
  const r = await ShareLink.updateOne({ _id: req.params.id, userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  if (!r.matchedCount) throw notFound('Không tìm thấy link chia sẻ');
  res.status(204).end();
});

/* ------------------------------------------------------------ công khai */

export const publicShareRouter = Router();

async function loadShare(token: string) {
  const share = await ShareLink.findOne({ token }).select('+passwordHash');
  if (!share || share.revokedAt) throw notFound('Link không tồn tại hoặc đã bị thu hồi');
  const status = statusOf(share);
  if (status === 'expired') throw gone('Link chia sẻ đã hết hạn');
  if (status === 'exhausted') throw gone('Link chia sẻ đã hết lượt tải');
  const file = await File.findOne({ _id: share.fileId, trashedAt: null });
  if (!file) throw notFound('File không còn tồn tại');
  return { share, file };
}

function accessTokenOf(req: Request) {
  const h = req.headers['x-share-access'];
  return (typeof h === 'string' ? h : undefined) ?? (typeof req.query.a === 'string' ? req.query.a : undefined);
}

function assertUnlocked(req: Request, share: ShareDoc) {
  if (share.passwordHash && !verifyShareAccess(accessTokenOf(req), share.id)) {
    throw new AppError(401, 'Link này được bảo vệ bằng mật khẩu', 'PASSWORD_REQUIRED');
  }
}

/** Link có giới hạn lượt tải thì không cho xem trước (tránh lách giới hạn). */
const canPreview = (share: ShareDoc, file: FileDoc) =>
  share.maxDownloads == null && safeInlineType(file.mimeType, file.kind) !== null;

publicShareRouter.get('/:token', async (req, res) => {
  const { share, file } = await loadShare(req.params.token);
  if (share.passwordHash && !verifyShareAccess(accessTokenOf(req), share.id)) {
    res.json({ requiresPassword: true });
    return;
  }
  await ShareLink.updateOne({ _id: share._id }, { $inc: { viewCount: 1 } });
  logActivity(share.userId, 'share_view', file._id);
  const owner = await User.findById(share.userId, { name: 1 }).lean();
  const thumbToken = file.thumbKey ? signMediaToken(file.id, 1800) : null;
  res.json({
    requiresPassword: false,
    share: {
      expiresAt: share.expiresAt,
      remainingDownloads: share.maxDownloads == null ? null : share.maxDownloads - share.downloadCount,
      ownerName: owner?.name ?? 'Người dùng',
      createdAt: share.createdAt,
    },
    file: {
      name: file.name,
      size: file.size,
      kind: file.kind,
      mimeType: file.mimeType,
      previewable: canPreview(share, file),
      thumbUrl: thumbToken ? `/api/media/${file.id}/thumb?t=${thumbToken}` : null,
    },
  });
});

publicShareRouter.post('/:token/unlock', unlockLimiter, async (req, res) => {
  const { password } = parse(z.object({ password: z.string().min(1, 'Vui lòng nhập mật khẩu').max(128) }), req.body ?? {});
  const { share } = await loadShare(String(req.params.token));
  if (!share.passwordHash) {
    res.json({ accessToken: signShareAccess(share.id) });
    return;
  }
  if (!(await bcrypt.compare(password, share.passwordHash))) throw unauthorized('Mật khẩu không đúng');
  res.json({ accessToken: signShareAccess(share.id) });
});

publicShareRouter.get('/:token/content', async (req, res, next) => {
  const { share, file } = await loadShare(req.params.token);
  assertUnlocked(req, share);
  const download = req.query.dl === '1';
  if (!download && !canPreview(share, file)) throw forbidden('Không thể xem trước file này');

  if (download && isFreshDownload(req)) {
    // Tăng lượt tải nguyên tử, không bao giờ vượt maxDownloads kể cả khi tải đồng thời
    const ok = await ShareLink.findOneAndUpdate(
      {
        _id: share._id,
        revokedAt: null,
        $or: [{ maxDownloads: null }, { $expr: { $lt: ['$downloadCount', '$maxDownloads'] } }],
      },
      { $inc: { downloadCount: 1 } },
    );
    if (!ok) throw gone('Link chia sẻ đã hết lượt tải');
    await File.updateOne({ _id: file._id }, { $inc: { downloadCount: 1 } });
    logActivity(share.userId, 'share_download', file._id, file.size);
  }
  await sendStored(req, res, next, file, { download, cacheSeconds: 0 });
});

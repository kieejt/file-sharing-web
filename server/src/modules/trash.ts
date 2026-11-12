import { Router } from 'express';
import { z } from 'zod';
import { File } from '../models/File.js';
import { Folder } from '../models/Folder.js';
import { env } from '../config/env.js';
import { parse } from '../lib/validate.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { emptyTrash, purgeBatch, restoreBatch, toFileDTO } from '../services/drive.js';

const batchParam = z.object({ batch: z.string().uuid('Mã không hợp lệ') });

export const trashRouter = Router();
trashRouter.use(requireAuth);

trashRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  const [files, folders] = await Promise.all([
    File.find({ userId: user._id, trashRoot: true, trashedAt: { $ne: null } }).sort({ trashedAt: -1 }),
    Folder.find({ userId: user._id, trashRoot: true, trashedAt: { $ne: null } }).sort({ trashedAt: -1 }),
  ]);

  // Thống kê số file và dung lượng bên trong mỗi thư mục đã xoá
  const batches = folders.map((f) => f.trashBatch!);
  const inside = batches.length
    ? await File.aggregate<{ _id: string; count: number; size: number }>([
        { $match: { userId: user._id, trashBatch: { $in: batches } } },
        { $group: { _id: '$trashBatch', count: { $sum: 1 }, size: { $sum: '$size' } } },
      ])
    : [];
  const stat = new Map(inside.map((s) => [s._id, s]));

  const items = [
    ...folders.map((f) => ({
      type: 'folder' as const,
      batch: f.trashBatch!,
      id: f.id as string,
      name: f.name,
      size: stat.get(f.trashBatch!)?.size ?? 0,
      itemCount: stat.get(f.trashBatch!)?.count ?? 0,
      trashedAt: f.trashedAt!,
    })),
    ...files.map((f) => ({ type: 'file' as const, batch: f.trashBatch!, ...toFileDTO(f), trashedAt: f.trashedAt! })),
  ].sort((a, b) => +new Date(b.trashedAt) - +new Date(a.trashedAt));

  res.json({ items, retentionDays: env.TRASH_RETENTION_DAYS });
});

trashRouter.post('/:batch/restore', async (req, res) => {
  const { batch } = parse(batchParam, req.params);
  await restoreBatch(currentUser(req).id, batch);
  res.status(204).end();
});

trashRouter.delete('/:batch', async (req, res) => {
  const { batch } = parse(batchParam, req.params);
  await purgeBatch(currentUser(req).id, batch);
  res.status(204).end();
});

trashRouter.delete('/', async (req, res) => {
  const freed = await emptyTrash(currentUser(req).id);
  res.json({ freed });
});

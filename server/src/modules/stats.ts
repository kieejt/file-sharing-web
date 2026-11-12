import { Router } from 'express';
import { File } from '../models/File.js';
import { Folder } from '../models/Folder.js';
import { ShareLink } from '../models/ShareLink.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { dailyActivity, kindBreakdown } from '../services/stats.js';

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get('/', async (req, res) => {
  const user = currentUser(req);
  const uid = user._id;
  const now = new Date();
  const [fileCount, folderCount, trash, downloads, activeShares, byKind, daily, topFiles] = await Promise.all([
    File.countDocuments({ userId: uid, trashedAt: null }),
    Folder.countDocuments({ userId: uid, trashedAt: null }),
    File.aggregate<{ size: number; count: number }>([
      { $match: { userId: uid, trashedAt: { $ne: null } } },
      { $group: { _id: null, size: { $sum: '$size' }, count: { $sum: 1 } } },
    ]),
    File.aggregate<{ total: number }>([
      { $match: { userId: uid } },
      { $group: { _id: null, total: { $sum: '$downloadCount' } } },
    ]),
    ShareLink.countDocuments({
      userId: uid,
      revokedAt: null,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ maxDownloads: null }, { $expr: { $lt: ['$downloadCount', '$maxDownloads'] } }] },
      ],
    }),
    kindBreakdown({ userId: uid }),
    dailyActivity({ userId: uid }),
    File.find({ userId: uid, trashedAt: null, downloadCount: { $gt: 0 } }, { name: 1, kind: 1, downloadCount: 1, size: 1 })
      .sort({ downloadCount: -1 })
      .limit(5)
      .lean(),
  ]);

  res.json({
    storage: { used: user.storageUsed, quota: user.storageQuota, trash: trash[0]?.size ?? 0 },
    counts: { files: fileCount, folders: folderCount, trashFiles: trash[0]?.count ?? 0, downloads: downloads[0]?.total ?? 0, activeShares },
    byKind,
    daily,
    topFiles: topFiles.map((f) => ({ id: String(f._id), name: f.name, kind: f.kind, size: f.size, downloadCount: f.downloadCount })),
  });
});

import { Router } from 'express';
import { Types } from 'mongoose';
import { File } from '../models/File.js';
import { verifyMediaToken } from '../lib/tokens.js';
import { forbidden, notFound } from '../lib/errors.js';
import { storage } from '../lib/storage.js';
import { isFreshDownload, sendStored } from '../lib/sendStored.js';
import { logActivity } from '../services/drive.js';

/** Phục vụ nội dung file qua signed URL ngắn hạn (?t=...), dùng được trong <img>, <video>, <a>. */
export const mediaRouter = Router();

async function loadSigned(id: string, token: unknown) {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  if (typeof token !== 'string' || !verifyMediaToken(token, id)) throw forbidden('Liên kết đã hết hạn, vui lòng tải lại trang');
  const file = await File.findOne({ _id: id, trashedAt: null });
  if (!file) throw notFound('Không tìm thấy file');
  return file;
}

mediaRouter.get('/:id/content', async (req, res, next) => {
  const file = await loadSigned(req.params.id, req.query.t);
  const download = req.query.dl === '1';
  if (download && isFreshDownload(req)) {
    await File.updateOne({ _id: file._id }, { $inc: { downloadCount: 1 } });
    logActivity(file.userId, 'download', file._id, file.size);
  }
  await sendStored(req, res, next, file, { download });
});

mediaRouter.get('/:id/thumb', async (req, res, next) => {
  const file = await loadSigned(req.params.id, req.query.t);
  if (!file.thumbKey) throw notFound();
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'private, max-age=3600, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(storage.resolve(file.thumbKey), (err) => {
    if (err && !res.headersSent) next(err);
  });
});

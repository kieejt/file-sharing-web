import type { Request, Response, NextFunction } from 'express';
import { create as contentDisposition } from 'content-disposition';
import { storage } from './storage.js';
import { safeInlineType } from './fileKind.js';
import { forbidden, notFound } from './errors.js';
import type { FileDoc } from '../models/File.js';

/** Request tải xuống "thật" (không phải các đoạn Range tiếp theo của cùng một lượt tải). */
export const isFreshDownload = (req: Request) => {
  const range = req.headers.range;
  return !range || /^bytes=0-/.test(range);
};

/**
 * Stream file từ đĩa với hỗ trợ HTTP Range (tua video, tải tiếp).
 * - download=true: luôn tải xuống (attachment)
 * - download=false: chỉ hiển thị inline nếu là kiểu an toàn; kèm CSP sandbox
 */
export async function sendStored(
  req: Request,
  res: Response,
  next: NextFunction,
  file: FileDoc,
  opts: { download: boolean; cacheSeconds?: number },
) {
  if (!(await storage.exists(file.storageKey))) throw notFound('File không còn tồn tại trên máy chủ');
  const inlineType = safeInlineType(file.mimeType, file.kind);
  if (!opts.download && !inlineType) throw forbidden('Không thể xem trước loại file này');

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', opts.download ? 'application/octet-stream' : inlineType!);
  res.setHeader('Content-Disposition', contentDisposition(file.name, { type: opts.download ? 'attachment' : 'inline' }));
  res.setHeader('Cache-Control', `private, max-age=${opts.cacheSeconds ?? 300}`);
  // PDF cần chạy trình xem PDF của trình duyệt nên không áp sandbox
  if (opts.download) {
    res.setHeader('Content-Security-Policy', "default-src 'none'");
  } else if (file.mimeType === 'application/pdf') {
    res.removeHeader('Content-Security-Policy');
  } else {
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'");
  }
  res.sendFile(storage.resolve(file.storageKey), { dotfiles: 'allow' }, (err) => {
    if (err && !res.headersSent) next(err);
  });
}

import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { storage } from '../lib/storage.js';

export const MAX_FILES_PER_REQUEST = 20;

export const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => cb(null, storage.userDir(req.user!.id)),
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: env.maxFileSize, files: MAX_FILES_PER_REQUEST, fields: 10 },
  // Giải mã tên file theo UTF-8 để tên tiếng Việt hiển thị đúng
  defParamCharset: 'utf8',
});

export const keyFromUploaded = (userId: string, file: Express.Multer.File) =>
  `${userId}/${path.basename(file.path)}`;

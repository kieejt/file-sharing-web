import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { Types } from 'mongoose';
import sharp from 'sharp';
import { z } from 'zod';
import { File } from '../models/File.js';
import { Folder, toFolderDTO } from '../models/Folder.js';
import { Upload, type UploadDoc } from '../models/Upload.js';
import { objectId, parse, escapeRegex, normalizeName } from '../lib/validate.js';
import { AppError, badRequest, notFound } from '../lib/errors.js';
import { env } from '../config/env.js';
import { detectKind, THUMBNAIL_MIME } from '../lib/fileKind.js';
import { storage } from '../lib/storage.js';
import { logger } from '../lib/logger.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { keyFromUploaded, upload, MAX_FILES_PER_REQUEST } from '../middleware/upload.js';
import {
  breadcrumbsOf,
  discardUpload,
  fileLinks,
  getOwnedFile,
  getOwnedFolder,
  logActivity,
  moveFolder,
  refundQuota,
  reserveQuota,
  resolveTargetFolder,
  toFileDTO,
  trashFile,
  trashFolder,
} from '../services/drive.js';
import { FILE_KINDS } from '../models/File.js';

const folderRef = z.union([z.literal('root'), objectId]).nullable().optional();
const DRIVE_PAGE_SIZE = 200;
const sortSchema = z.object({
  sort: z.enum(['name', 'createdAt', 'size']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/** Bỏ ký tự điều khiển và dấu phân cách đường dẫn khỏi tên do người dùng nhập. */
export function cleanName(name: string) {
  return name.replace(/[\u0000-\u001f\u007f/\\]/g, '').trim().slice(0, 255);
}
const nameSchema = z.string().transform(cleanName).pipe(z.string().min(1, 'Tên không được để trống'));

export const filesRouter = Router();
filesRouter.use(requireAuth);

/* -------------------------------------------------------------- upload */

/** Từ chối sớm (trước khi nhận dữ liệu) nếu request rõ ràng vượt hạn mức dung lượng. */
function quotaPrecheck(req: Request, _res: Response, next: NextFunction) {
  const user = currentUser(req);
  const len = Number(req.headers['content-length'] ?? 0);
  if (len > 0 && user.storageUsed + len > user.storageQuota + 64 * 1024) {
    throw new AppError(413, 'Không đủ dung lượng lưu trữ', 'QUOTA_EXCEEDED');
  }
  next();
}

// sharp giải mã cả ảnh trong RAM: xử lý 20 ảnh lớn cùng lúc dễ làm tràn bộ nhớ
const THUMBNAIL_CONCURRENCY = 3;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>) {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function makeThumbnail(userId: string, sourceKey: string, mime: string) {
  if (!THUMBNAIL_MIME.has(mime)) return null;
  const thumbKey = storage.newKey(userId, '.thumb.webp');
  try {
    await sharp(storage.resolve(sourceKey), { animated: false })
      .rotate()
      .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 74 })
      .toFile(storage.resolve(thumbKey));
    return thumbKey;
  } catch (err) {
    logger.debug({ err }, 'thumbnail failed');
    await storage.remove(thumbKey);
    return null;
  }
}

filesRouter.post('/files/upload', quotaPrecheck, upload.array('files', MAX_FILES_PER_REQUEST), async (req, res) => {
  const user = currentUser(req);
  const uploaded = (req.files as Express.Multer.File[] | undefined) ?? [];
  const keys = uploaded.map((f) => keyFromUploaded(user.id, f));
  const cleanup = () => Promise.all(keys.map((k) => storage.remove(k)));

  if (!uploaded.length) throw badRequest('Vui lòng chọn ít nhất một file');

  let folder;
  try {
    const { folderId } = parse(z.object({ folderId: folderRef }), req.body ?? {});
    folder = await resolveTargetFolder(user.id, folderId);
  } catch (err) {
    await cleanup();
    throw err;
  }

  const total = uploaded.reduce((s, f) => s + f.size, 0);
  if (!(await reserveQuota(user._id, total))) {
    await cleanup();
    throw new AppError(413, 'Không đủ dung lượng lưu trữ', 'QUOTA_EXCEEDED');
  }

  // Mỗi tác vụ tự bắt lỗi để không còn tác vụ nào chạy tiếp sau khi đã rollback
  const errors: unknown[] = [];
  const thumbKeys: string[] = [];
  const results = await mapLimit(uploaded, THUMBNAIL_CONCURRENCY, async (f, i) => {
    try {
      const name = cleanName(f.originalname) || 'khong-ten';
      const mimeType = f.mimetype || 'application/octet-stream';
      const thumbKey = await makeThumbnail(user.id, keys[i]!, mimeType);
      if (thumbKey) thumbKeys.push(thumbKey);
      return await File.create({
        name,
        mimeType,
        kind: detectKind(name, mimeType),
        size: f.size,
        storageKey: keys[i],
        thumbKey,
        userId: user._id,
        folderId: folder?._id ?? null,
      });
    } catch (err) {
      errors.push(err);
      return null;
    }
  });

  if (errors.length) {
    const created = results.filter((d) => d !== null);
    await Promise.all([
      cleanup(),
      ...thumbKeys.map((k) => storage.remove(k)),
      File.deleteMany({ _id: { $in: created.map((d) => d._id) } }),
      refundQuota(user._id, total),
    ]);
    throw errors[0];
  }

  const docs = results.filter((d) => d !== null);
  for (const d of docs) logActivity(user._id, 'upload', d._id, d.size);
  res.status(201).json({ files: docs.map(toFileDTO) });
});

/* ------------------------------------------- upload theo đoạn (resume) */

const MAX_CHUNK = 16 * 1024 * 1024;
const UPLOAD_SESSION_HOURS = 24;
const busyUploads = new Set<string>();

async function getOwnedUpload(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Không tìm thấy phiên tải lên');
  const up = await Upload.findOne({ _id: id, userId });
  if (!up) throw notFound('Phiên tải lên không tồn tại hoặc đã hết hạn');
  return up;
}

/** Số byte đã nhận lấy từ kích thước file tạm trên đĩa, nên vẫn đúng khi một đoạn bị đứt giữa chừng. */
const receivedOf = async (up: UploadDoc) => (await fsp.stat(storage.resolve(up.storageKey))).size;

/** Mỗi phiên chỉ xử lý một request tại một thời điểm (ghi nối đuôi file tạm không an toàn khi song song). */
async function withUploadLock<T>(up: UploadDoc, fn: () => Promise<T>) {
  if (busyUploads.has(up.id)) throw new AppError(409, 'Phiên tải lên đang xử lý một đoạn khác', 'UPLOAD_BUSY');
  busyUploads.add(up.id);
  try {
    return await fn();
  } finally {
    busyUploads.delete(up.id);
  }
}

const createUploadSchema = z.object({
  name: nameSchema,
  size: z.number().int().min(1),
  mimeType: z.string().max(255).optional(),
  folderId: folderRef,
});

filesRouter.post('/files/uploads', async (req, res) => {
  const user = currentUser(req);
  const body = parse(createUploadSchema, req.body ?? {});
  if (body.size > env.maxFileSize) throw new AppError(413, `File vượt quá giới hạn ${env.MAX_FILE_SIZE_MB} MB`, 'FILE_TOO_LARGE');
  const folder = await resolveTargetFolder(user.id, body.folderId);
  if (!(await reserveQuota(user._id, body.size))) throw new AppError(413, 'Không đủ dung lượng lưu trữ', 'QUOTA_EXCEEDED');

  const storageKey = storage.newKey(user.id, '.part');
  try {
    storage.userDir(user.id);
    await fsp.writeFile(storage.resolve(storageKey), '');
    const up = await Upload.create({
      userId: user._id,
      name: body.name,
      mimeType: body.mimeType || 'application/octet-stream',
      size: body.size,
      folderId: folder?._id ?? null,
      storageKey,
      expiresAt: new Date(Date.now() + UPLOAD_SESSION_HOURS * 3_600_000),
    });
    res.status(201).json({ upload: { id: up.id as string, received: 0, size: up.size } });
  } catch (err) {
    await storage.remove(storageKey);
    await refundQuota(user._id, body.size);
    throw err;
  }
});

filesRouter.get('/files/uploads/:id', async (req, res) => {
  const up = await getOwnedUpload(currentUser(req).id, req.params.id);
  res.json({ received: await receivedOf(up), size: up.size });
});

filesRouter.put('/files/uploads/:id', async (req, res) => {
  const { offset } = parse(z.object({ offset: z.coerce.number().int().min(0) }), req.query);
  const up = await getOwnedUpload(currentUser(req).id, req.params.id);
  await withUploadLock(up, async () => {
    const current = await receivedOf(up);
    if (offset !== current) throw new AppError(409, 'Sai vị trí đoạn tải lên', 'OFFSET_MISMATCH', { received: current });
    const room = Math.min(up.size - current, MAX_CHUNK);
    if (room <= 0) throw new AppError(409, 'Phiên tải lên đã nhận đủ dữ liệu', 'UPLOAD_COMPLETE');
    let seen = 0;
    const limit = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        seen += chunk.length;
        cb(seen > room ? new AppError(413, 'Đoạn tải lên vượt quá kích thước cho phép', 'CHUNK_TOO_LARGE') : null, chunk);
      },
    });
    try {
      await pipeline(req, limit, fs.createWriteStream(storage.resolve(up.storageKey), { flags: 'a' }));
    } catch (err) {
      // Client ngắt kết nối giữa đoạn: không còn ai nhận phản hồi, phần đã ghi vẫn được giữ để resume
      if ((err as NodeJS.ErrnoException).code === 'ERR_STREAM_PREMATURE_CLOSE') return;
      throw err;
    }
    res.json({ received: current + seen });
  });
});

filesRouter.post('/files/uploads/:id/complete', async (req, res) => {
  const user = currentUser(req);
  const up = await getOwnedUpload(user.id, req.params.id);
  const file = await withUploadLock(up, async () => {
    if ((await receivedOf(up)) !== up.size) throw new AppError(409, 'Chưa tải lên đủ dữ liệu', 'UPLOAD_INCOMPLETE');
    const folder = await resolveTargetFolder(user.id, up.folderId ? String(up.folderId) : null);
    const finalKey = storage.newKey(user.id);
    let thumbKey: string | null = null;
    await fsp.rename(storage.resolve(up.storageKey), storage.resolve(finalKey));
    try {
      thumbKey = await makeThumbnail(user.id, finalKey, up.mimeType);
      const doc = await File.create({
        name: up.name,
        mimeType: up.mimeType,
        kind: detectKind(up.name, up.mimeType),
        size: up.size,
        storageKey: finalKey,
        thumbKey,
        userId: user._id,
        folderId: folder?._id ?? null,
      });
      await Upload.deleteOne({ _id: up._id });
      return doc;
    } catch (err) {
      // Trả file tạm về chỗ cũ để client có thể gọi lại complete
      await fsp.rename(storage.resolve(finalKey), storage.resolve(up.storageKey)).catch(() => undefined);
      await storage.remove(thumbKey);
      throw err;
    }
  });
  logActivity(user._id, 'upload', file._id, file.size);
  res.status(201).json({ file: toFileDTO(file) });
});

filesRouter.delete('/files/uploads/:id', async (req, res) => {
  const up = await getOwnedUpload(currentUser(req).id, req.params.id);
  await withUploadLock(up, () => discardUpload(up));
  res.status(204).end();
});

/* --------------------------------------------------------------- drive */

filesRouter.get('/drive', async (req, res) => {
  const user = currentUser(req);
  const q = parse(
    sortSchema.extend({
      folderId: folderRef,
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(500).default(DRIVE_PAGE_SIZE),
    }),
    req.query,
  );
  const folder = await resolveTargetFolder(user.id, q.folderId);
  const dir = q.order === 'asc' ? 1 : -1;
  const fileFilter = { userId: user._id, folderId: folder?._id ?? null, trashedAt: null };
  // Thư mục luôn trả đủ ở mọi trang (ít và cần cho điều hướng); chỉ file được phân trang
  const [folders, files, totalFiles, breadcrumbs] = await Promise.all([
    Folder.find({ userId: user._id, parentId: folder?._id ?? null, trashedAt: null })
      .collation({ locale: 'vi' })
      .sort(q.sort === 'name' ? { name: dir } : { createdAt: -1 }),
    File.find(fileFilter)
      .collation({ locale: 'vi' })
      .sort({ [q.sort]: dir, _id: dir })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    File.countDocuments(fileFilter),
    breadcrumbsOf(folder),
  ]);
  res.json({
    folder: folder ? toFolderDTO(folder) : null,
    breadcrumbs,
    folders: folders.map(toFolderDTO),
    files: files.map(toFileDTO),
    totalFiles,
    page: q.page,
    hasMore: q.page * q.limit < totalFiles,
  });
});

const searchSchema = sortSchema.extend({
  q: z.string().trim().max(100).optional(),
  kind: z.enum(FILE_KINDS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

filesRouter.get('/files', async (req, res) => {
  const user = currentUser(req);
  const q = parse(searchSchema, req.query);
  const filter: Record<string, unknown> = { userId: user._id, trashedAt: null };
  if (q.q) filter.nameNorm = { $regex: escapeRegex(normalizeName(q.q)) };
  if (q.kind) filter.kind = q.kind;
  const dir = q.order === 'asc' ? 1 : -1;
  const [items, total] = await Promise.all([
    File.find(filter)
      .collation({ locale: 'vi' })
      .sort({ [q.sort]: dir, _id: dir })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    File.countDocuments(filter),
  ]);
  res.json({ items: items.map(toFileDTO), total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
});

filesRouter.get('/files/:id', async (req, res) => {
  const user = currentUser(req);
  const file = await getOwnedFile(user.id, req.params.id);
  const folder = file.folderId ? await Folder.findOne({ _id: file.folderId, trashedAt: null }) : null;
  res.json({ file: toFileDTO(file), links: fileLinks(file.id), breadcrumbs: await breadcrumbsOf(folder) });
});

filesRouter.get('/files/:id/links', async (req, res) => {
  const file = await getOwnedFile(currentUser(req).id, req.params.id);
  res.json(fileLinks(file.id));
});

const updateFileSchema = z.object({
  name: nameSchema.optional(),
  description: z.string().max(2000).optional(),
  folderId: folderRef,
});

filesRouter.patch('/files/:id', async (req, res) => {
  const user = currentUser(req);
  const body = parse(updateFileSchema, req.body);
  const file = await getOwnedFile(user.id, req.params.id);
  if (body.name !== undefined) file.name = body.name;
  if (body.description !== undefined) file.description = body.description.trim();
  if (body.folderId !== undefined) {
    const target = await resolveTargetFolder(user.id, body.folderId);
    file.folderId = target?._id ?? null;
  }
  await file.save();
  res.json({ file: toFileDTO(file) });
});

filesRouter.delete('/files/:id', async (req, res) => {
  await trashFile(currentUser(req).id, req.params.id);
  res.status(204).end();
});

/* ------------------------------------------------------------- folders */

filesRouter.get('/folders/tree', async (req, res) => {
  const folders = await Folder.find({ userId: currentUser(req)._id, trashedAt: null }, { name: 1, parentId: 1 })
    .collation({ locale: 'vi' })
    .sort({ name: 1 })
    .lean();
  res.json({ folders: folders.map((f) => ({ id: String(f._id), name: f.name, parentId: f.parentId ? String(f.parentId) : null })) });
});

filesRouter.post('/folders', async (req, res) => {
  const user = currentUser(req);
  const body = parse(z.object({ name: nameSchema, parentId: folderRef }), req.body);
  const parent = await resolveTargetFolder(user.id, body.parentId);
  const folder = await Folder.create({
    name: body.name,
    userId: user._id,
    parentId: parent?._id ?? null,
    ancestors: parent ? [...parent.ancestors, parent._id] : [],
  });
  res.status(201).json({ folder: toFolderDTO(folder) });
});

filesRouter.patch('/folders/:id', async (req, res) => {
  const user = currentUser(req);
  const body = parse(z.object({ name: nameSchema.optional(), parentId: folderRef }), req.body);
  const folder = await getOwnedFolder(user.id, req.params.id);
  if (body.name !== undefined) folder.name = body.name;
  if (body.parentId !== undefined) {
    await moveFolder(folder, await resolveTargetFolder(user.id, body.parentId));
  } else {
    await folder.save();
  }
  res.json({ folder: toFolderDTO(folder) });
});

filesRouter.delete('/folders/:id', async (req, res) => {
  await trashFolder(currentUser(req).id, req.params.id);
  res.status(204).end();
});

/* ------------------------------------------------------- bulk actions */

const bulkSchema = z.object({
  fileIds: z.array(objectId).max(500).default([]),
  folderIds: z.array(objectId).max(500).default([]),
});

filesRouter.post('/drive/move', async (req, res) => {
  const user = currentUser(req);
  const body = parse(bulkSchema.extend({ targetId: z.union([z.literal('root'), objectId]) }), req.body);
  const target = await resolveTargetFolder(user.id, body.targetId);
  for (const id of body.folderIds) await moveFolder(await getOwnedFolder(user.id, id), target);
  if (body.fileIds.length) {
    await File.updateMany(
      { _id: { $in: body.fileIds }, userId: user._id, trashedAt: null },
      { $set: { folderId: target?._id ?? null } },
    );
  }
  res.status(204).end();
});

filesRouter.post('/drive/trash', async (req, res) => {
  const user = currentUser(req);
  const body = parse(bulkSchema, req.body);
  // Một mục có thể đã vào thùng rác cùng thư mục cha ở bước trước: bỏ qua lỗi 404
  const ignoreMissing = (err: unknown) => {
    if (!(err instanceof AppError && err.status === 404)) throw err;
  };
  for (const id of body.folderIds) await trashFolder(user.id, id).catch(ignoreMissing);
  for (const id of body.fileIds) await trashFile(user.id, id).catch(ignoreMissing);
  res.status(204).end();
});

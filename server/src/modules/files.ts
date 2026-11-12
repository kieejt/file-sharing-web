import { Router, type NextFunction, type Request, type Response } from 'express';
import sharp from 'sharp';
import { z } from 'zod';
import { File } from '../models/File.js';
import { Folder, toFolderDTO } from '../models/Folder.js';
import { User } from '../models/User.js';
import { objectId, parse, escapeRegex } from '../lib/validate.js';
import { AppError, badRequest } from '../lib/errors.js';
import { detectKind, THUMBNAIL_MIME } from '../lib/fileKind.js';
import { storage } from '../lib/storage.js';
import { logger } from '../lib/logger.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { keyFromUploaded, upload, MAX_FILES_PER_REQUEST } from '../middleware/upload.js';
import {
  breadcrumbsOf,
  fileLinks,
  getOwnedFile,
  getOwnedFolder,
  logActivity,
  moveFolder,
  resolveTargetFolder,
  toFileDTO,
  trashFile,
  trashFolder,
} from '../services/drive.js';
import { FILE_KINDS } from '../models/File.js';

const folderRef = z.union([z.literal('root'), objectId]).nullable().optional();
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
  const reserved = await User.updateOne(
    { _id: user._id, $expr: { $lte: [{ $add: ['$storageUsed', total] }, '$storageQuota'] } },
    { $inc: { storageUsed: total } },
  );
  if (!reserved.modifiedCount) {
    await cleanup();
    throw new AppError(413, 'Không đủ dung lượng lưu trữ', 'QUOTA_EXCEEDED');
  }

  try {
    const docs = await Promise.all(
      uploaded.map(async (f, i) => {
        const name = cleanName(f.originalname) || 'khong-ten';
        const mimeType = f.mimetype || 'application/octet-stream';
        const thumbKey = await makeThumbnail(user.id, keys[i]!, mimeType);
        return File.create({
          name,
          mimeType,
          kind: detectKind(name, mimeType),
          size: f.size,
          storageKey: keys[i],
          thumbKey,
          userId: user._id,
          folderId: folder?._id ?? null,
        });
      }),
    );
    for (const d of docs) logActivity(user._id, 'upload', d._id, d.size);
    res.status(201).json({ files: docs.map(toFileDTO) });
  } catch (err) {
    await cleanup();
    await User.updateOne({ _id: user._id }, { $inc: { storageUsed: -total } });
    throw err;
  }
});

/* --------------------------------------------------------------- drive */

filesRouter.get('/drive', async (req, res) => {
  const user = currentUser(req);
  const q = parse(sortSchema.extend({ folderId: folderRef }), req.query);
  const folder = await resolveTargetFolder(user.id, q.folderId);
  const dir = q.order === 'asc' ? 1 : -1;
  const [folders, files, breadcrumbs] = await Promise.all([
    Folder.find({ userId: user._id, parentId: folder?._id ?? null, trashedAt: null })
      .collation({ locale: 'vi' })
      .sort(q.sort === 'name' ? { name: dir } : { createdAt: -1 }),
    File.find({ userId: user._id, folderId: folder?._id ?? null, trashedAt: null })
      .collation({ locale: 'vi' })
      .sort({ [q.sort]: dir, _id: dir })
      .limit(5000),
    breadcrumbsOf(folder),
  ]);
  res.json({
    folder: folder ? toFolderDTO(folder) : null,
    breadcrumbs,
    folders: folders.map(toFolderDTO),
    files: files.map(toFileDTO),
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
  if (q.q) filter.name = { $regex: escapeRegex(q.q), $options: 'i' };
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

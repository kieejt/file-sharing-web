import { randomUUID } from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Types } from 'mongoose';
import { File, type FileDoc } from '../models/File.js';
import { Folder, type FolderDoc } from '../models/Folder.js';
import { ShareLink } from '../models/ShareLink.js';
import { User } from '../models/User.js';
import { Upload, type UploadDoc } from '../models/Upload.js';
import { Activity, type ACTIVITY_TYPES } from '../models/Activity.js';
import { Session } from '../models/Session.js';
import { storage } from '../lib/storage.js';
import { safeInlineType } from '../lib/fileKind.js';
import { signMediaToken } from '../lib/tokens.js';
import { badRequest, notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { normalizeName } from '../lib/validate.js';
import { env } from '../config/env.js';

const oid = (id: string | Types.ObjectId) => (typeof id === 'string' ? new Types.ObjectId(id) : id);

/* ------------------------------------------------------------------ DTO */

export function toFileDTO(f: FileDoc) {
  const id = f.id as string;
  const token = signMediaToken(id);
  return {
    id,
    name: f.name,
    description: f.description,
    mimeType: f.mimeType,
    kind: f.kind,
    size: f.size,
    folderId: f.folderId ? String(f.folderId) : null,
    downloadCount: f.downloadCount,
    previewable: safeInlineType(f.mimeType, f.kind) !== null,
    thumbUrl: f.thumbKey ? `/api/media/${id}/thumb?t=${token}` : null,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    trashedAt: f.trashedAt,
  };
}

/** Link xem/tải mới (dùng khi người dùng bấm xem trước hoặc tải xuống). */
export function fileLinks(fileId: string) {
  const t = signMediaToken(fileId);
  return {
    viewUrl: `/api/media/${fileId}/content?t=${t}`,
    downloadUrl: `/api/media/${fileId}/content?t=${t}&dl=1`,
  };
}

/* ------------------------------------------------------------- lookups */

export async function getOwnedFile(userId: string, fileId: string, opts: { trashed?: boolean } = {}) {
  if (!Types.ObjectId.isValid(fileId)) throw notFound('Không tìm thấy file');
  const f = await File.findOne({
    _id: fileId,
    userId,
    trashedAt: opts.trashed ? { $ne: null } : null,
  });
  if (!f) throw notFound('Không tìm thấy file');
  return f;
}

export async function getOwnedFolder(userId: string, folderId: string) {
  if (!Types.ObjectId.isValid(folderId)) throw notFound('Không tìm thấy thư mục');
  const f = await Folder.findOne({ _id: folderId, userId, trashedAt: null });
  if (!f) throw notFound('Không tìm thấy thư mục');
  return f;
}

/** null/'root' = thư mục gốc. */
export async function resolveTargetFolder(userId: string, folderId: string | null | undefined) {
  if (!folderId || folderId === 'root') return null;
  return getOwnedFolder(userId, folderId);
}

export async function breadcrumbsOf(folder: FolderDoc | null) {
  if (!folder) return [];
  const ancestors = await Folder.find({ _id: { $in: folder.ancestors } }, { name: 1 }).lean();
  const byId = new Map(ancestors.map((a) => [String(a._id), a.name]));
  return [
    ...folder.ancestors.map((a) => ({ id: String(a), name: byId.get(String(a)) ?? '...' })),
    { id: folder.id as string, name: folder.name },
  ];
}

/* ---------------------------------------------------------------- move */

export async function moveFolder(folder: FolderDoc, target: FolderDoc | null) {
  if (target) {
    if (target._id.equals(folder._id) || target.ancestors.some((a) => a.equals(folder._id))) {
      throw badRequest('Không thể di chuyển thư mục vào chính nó hoặc thư mục con của nó');
    }
  }
  const newAncestors = target ? [...target.ancestors, target._id] : [];
  const descendants = await Folder.find({ ancestors: folder._id }, { ancestors: 1 });
  if (descendants.length) {
    await Folder.bulkWrite(
      descendants.map((d) => {
        const idx = d.ancestors.findIndex((a) => a.equals(folder._id));
        return {
          updateOne: {
            filter: { _id: d._id },
            update: { $set: { ancestors: [...newAncestors, folder._id, ...d.ancestors.slice(idx + 1)] } },
          },
        };
      }),
    );
  }
  folder.parentId = target ? target._id : null;
  folder.ancestors = newAncestors;
  await folder.save();
}

/* --------------------------------------------------------------- trash */

export async function trashFile(userId: string, fileId: string) {
  const res = await File.updateOne(
    { _id: oid(fileId), userId, trashedAt: null },
    { $set: { trashedAt: new Date(), trashBatch: randomUUID(), trashRoot: true } },
  );
  if (!res.matchedCount) throw notFound('Không tìm thấy file');
}

export async function trashFolder(userId: string, folderId: string) {
  const folder = await getOwnedFolder(userId, folderId);
  const batch = randomUUID();
  const now = new Date();
  const set = { trashedAt: now, trashBatch: batch, trashRoot: false };
  await Folder.updateMany({ userId, trashedAt: null, $or: [{ _id: folder._id }, { ancestors: folder._id }] }, { $set: set });
  await Folder.updateOne({ _id: folder._id }, { $set: { trashRoot: true } });
  const ids = await Folder.find({ userId, trashBatch: batch }).distinct('_id');
  await File.updateMany({ userId, trashedAt: null, folderId: { $in: ids } }, { $set: set });
}

async function isActiveFolder(userId: string, id: Types.ObjectId | null | undefined) {
  if (!id) return false;
  return !!(await Folder.exists({ _id: id, userId, trashedAt: null }));
}

export async function restoreBatch(userId: string, batch: string) {
  const [rootFolder, rootFile] = await Promise.all([
    Folder.findOne({ userId, trashBatch: batch, trashRoot: true }),
    File.findOne({ userId, trashBatch: batch, trashRoot: true }),
  ]);
  if (!rootFolder && !rootFile) throw notFound('Không tìm thấy mục trong thùng rác');

  // Nếu thư mục cha đã bị xoá thì khôi phục về thư mục gốc
  if (rootFolder && rootFolder.parentId && !(await isActiveFolder(userId, rootFolder.parentId))) {
    await moveFolder(rootFolder, null);
  }
  if (rootFile && rootFile.folderId && !(await isActiveFolder(userId, rootFile.folderId))) {
    rootFile.folderId = null;
    await rootFile.save();
  }
  const clear = { $set: { trashedAt: null, trashBatch: null, trashRoot: false } };
  await Promise.all([
    Folder.updateMany({ userId, trashBatch: batch }, clear),
    File.updateMany({ userId, trashBatch: batch }, clear),
  ]);
}

async function deleteFilesHard(userId: Types.ObjectId | string, files: FileDoc[]) {
  if (!files.length) return 0;
  await Promise.all(files.flatMap((f) => [storage.remove(f.storageKey), storage.remove(f.thumbKey)]));
  const ids = files.map((f) => f._id);
  const total = files.reduce((s, f) => s + f.size, 0);
  await Promise.all([
    File.deleteMany({ _id: { $in: ids } }),
    ShareLink.deleteMany({ fileId: { $in: ids } }),
    User.updateOne(
      { _id: userId },
      [{ $set: { storageUsed: { $max: [0, { $subtract: ['$storageUsed', total] }] } } }],
      { updatePipeline: true },
    ),
  ]);
  return total;
}

export async function purgeBatch(userId: string, batch: string) {
  const files = await File.find({ userId, trashBatch: batch });
  const folders = await Folder.countDocuments({ userId, trashBatch: batch });
  if (!files.length && !folders) throw notFound('Không tìm thấy mục trong thùng rác');
  await deleteFilesHard(userId, files);
  await Folder.deleteMany({ userId, trashBatch: batch });
}

export async function emptyTrash(userId: string) {
  const files = await File.find({ userId, trashedAt: { $ne: null } });
  const freed = await deleteFilesHard(userId, files);
  await Folder.deleteMany({ userId, trashedAt: { $ne: null } });
  return freed;
}

/** Xoá vĩnh viễn các mục nằm trong thùng rác quá hạn lưu giữ. */
export async function purgeExpiredTrash(now = new Date()) {
  const cutoff = new Date(now.getTime() - env.TRASH_RETENTION_DAYS * 86_400_000);
  const roots = [
    ...(await File.find({ trashRoot: true, trashedAt: { $lt: cutoff } }, { userId: 1, trashBatch: 1 }).lean()),
    ...(await Folder.find({ trashRoot: true, trashedAt: { $lt: cutoff } }, { userId: 1, trashBatch: 1 }).lean()),
  ];
  for (const r of roots) {
    try {
      await purgeBatch(String(r.userId), r.trashBatch!);
    } catch (err) {
      logger.warn({ err }, 'purge trash batch failed');
    }
  }
  return roots.length;
}

/** Xoá toàn bộ dữ liệu của một người dùng (dùng cho admin). */
export async function deleteUserData(userId: string) {
  const files = await File.find({ userId });
  await deleteFilesHard(userId, files);
  await Promise.all([
    Folder.deleteMany({ userId }),
    ShareLink.deleteMany({ userId }),
    Activity.deleteMany({ userId }),
    Session.deleteMany({ userId }),
    Upload.deleteMany({ userId }),
  ]);
  await fsp.rm(path.join(storage.root, userId), { recursive: true, force: true });
}

/* --------------------------------------------------- quota & upload dở */

/** Giữ chỗ dung lượng một cách nguyên tử; trả false nếu vượt hạn mức. */
export async function reserveQuota(userId: Types.ObjectId | string, bytes: number) {
  const r = await User.updateOne(
    { _id: userId, $expr: { $lte: [{ $add: ['$storageUsed', bytes] }, '$storageQuota'] } },
    { $inc: { storageUsed: bytes } },
  );
  return r.modifiedCount > 0;
}

export const refundQuota = (userId: Types.ObjectId | string, bytes: number) =>
  User.updateOne({ _id: userId }, [{ $set: { storageUsed: { $max: [0, { $subtract: ['$storageUsed', bytes] }] } } }], {
    updatePipeline: true,
  });

/** Huỷ một phiên tải theo đoạn: xoá file tạm và trả lại dung lượng đã giữ chỗ. */
export async function discardUpload(up: UploadDoc) {
  await storage.remove(up.storageKey);
  await Upload.deleteOne({ _id: up._id });
  await refundQuota(up.userId, up.size);
}

export async function purgeExpiredUploads(now = new Date()) {
  const expired = await Upload.find({ expiresAt: { $lt: now } });
  for (const up of expired) {
    try {
      await discardUpload(up);
    } catch (err) {
      logger.warn({ err }, 'purge expired upload failed');
    }
  }
  return expired.length;
}

/**
 * Xoá file trên đĩa không còn bản ghi nào trỏ tới (rớt lại do lỗi hoặc server chết giữa chừng).
 * Chỉ động vào file cũ hơn `graceMs` và thư mục của user còn tồn tại, để không xoá nhầm khi trỏ nhầm DB.
 */
export async function sweepOrphanFiles(graceMs = 86_400_000) {
  const cutoff = Date.now() - graceMs;
  let removed = 0;
  for (const userId of await fsp.readdir(storage.root).catch(() => [])) {
    if (!Types.ObjectId.isValid(userId) || !(await User.exists({ _id: userId }))) continue;
    const entries = await fsp.readdir(path.join(storage.root, userId), { withFileTypes: true });
    const old: string[] = [];
    for (const e of entries) {
      if (e.isFile() && (await fsp.stat(path.join(storage.root, userId, e.name))).mtimeMs < cutoff) old.push(`${userId}/${e.name}`);
    }
    if (!old.length) continue;
    const [files, uploads] = await Promise.all([
      File.find({ userId, $or: [{ storageKey: { $in: old } }, { thumbKey: { $in: old } }] }, { storageKey: 1, thumbKey: 1 }).lean(),
      Upload.find({ userId, storageKey: { $in: old } }, { storageKey: 1 }).lean(),
    ]);
    const known = new Set<string | null | undefined>([...files.flatMap((f) => [f.storageKey, f.thumbKey]), ...uploads.map((u) => u.storageKey)]);
    for (const key of old) {
      if (known.has(key)) continue;
      await storage.remove(key);
      removed++;
    }
  }
  return removed;
}

/** Điền `nameNorm` cho file tạo trước khi có trường này (chạy lúc khởi động, rất nhanh khi đã xong). */
export async function backfillNameNorm() {
  let ops: Parameters<typeof File.bulkWrite>[0] = [];
  let done = 0;
  const flush = async () => {
    if (!ops.length) return;
    await File.bulkWrite(ops);
    done += ops.length;
    ops = [];
  };
  for await (const f of File.find({ nameNorm: { $exists: false } }, { name: 1 }).lean().cursor()) {
    ops.push({ updateOne: { filter: { _id: f._id }, update: { $set: { nameNorm: normalizeName(f.name) } } } });
    if (ops.length >= 500) await flush();
  }
  await flush();
  return done;
}

/* ------------------------------------------------------------ activity */

export function logActivity(
  userId: string | Types.ObjectId,
  type: (typeof ACTIVITY_TYPES)[number],
  fileId?: string | Types.ObjectId | null,
  bytes = 0,
) {
  Activity.create({ userId, type, fileId: fileId ?? null, bytes }).catch((err) =>
    logger.warn({ err }, 'activity log failed'),
  );
}

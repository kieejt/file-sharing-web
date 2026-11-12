import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Lưu trữ cục bộ trên đĩa. File được đặt tên ngẫu nhiên trong thư mục riêng của từng user,
 * không bao giờ dùng tên do người dùng gửi lên làm đường dẫn.
 */
export const storage = {
  root: env.uploadDir,

  ensureRoot() {
    fs.mkdirSync(this.root, { recursive: true });
  },

  userDir(userId: string) {
    const dir = path.join(this.root, userId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  },

  newKey(userId: string, suffix = '') {
    return `${userId}/${randomUUID()}${suffix}`;
  },

  /** Đổi key thành đường dẫn tuyệt đối, chặn path traversal. */
  resolve(key: string) {
    const abs = path.resolve(this.root, key);
    if (!abs.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return abs;
  },

  async exists(key: string) {
    try {
      await fsp.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  },

  async remove(key: string | null | undefined) {
    if (!key) return;
    try {
      await fsp.unlink(this.resolve(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  },
};

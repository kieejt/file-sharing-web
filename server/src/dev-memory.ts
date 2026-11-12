/**
 * Chạy server với MongoDB nhúng (không cần cài MongoDB).
 * Dữ liệu lưu ở server/.devdata nên vẫn còn sau khi khởi động lại.
 * Tự tạo tài khoản demo: demo@fileshare.vn / Demo12345
 */
import fs from 'node:fs';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dbPath = path.resolve('.devdata/db');
fs.mkdirSync(dbPath, { recursive: true });

const mongod = await MongoMemoryServer.create({
  instance: { dbName: 'fileshare', dbPath, storageEngine: 'wiredTiger', port: 27027 },
});
process.env.MONGO_URI = mongod.getUri('fileshare');
process.env.JWT_SECRET ??= 'dev-only-secret-please-change-me-0123456789abcdef';
process.env.UPLOAD_DIR ??= './.devdata/uploads';

const { seedDemo } = await import('./scripts/seed.js');
const mongoose = (await import('mongoose')).default;
await mongoose.connect(process.env.MONGO_URI);
await seedDemo();
await mongoose.disconnect();

const stop = async () => {
  await mongod.stop({ doCleanup: false });
};
process.on('exit', () => void stop());

await import('./index.js');

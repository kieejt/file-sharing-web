import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';

const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileshare-test-'));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-0123456789-0123456789-abcdef';
process.env.UPLOAD_DIR = uploadDir;
process.env.MAX_FILE_SIZE_MB = '5';
process.env.DEFAULT_QUOTA_MB = '1';
process.env.MONGO_URI = `${inject('mongoUri')}fs-test-${process.pid}`;

const mongoose = (await import('mongoose')).default;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI!);
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

afterAll(async () => {
  await mongoose.disconnect();
  fs.rmSync(uploadDir, { recursive: true, force: true });
});

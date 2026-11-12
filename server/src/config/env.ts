import path from 'node:path';
import { z } from 'zod';

const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/fileshare'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải dài ít nhất 32 ký tự'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(200),
  DEFAULT_QUOTA_MB: z.coerce.number().positive().default(2048),
  TRASH_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  TRUST_PROXY: bool.default(false),
  CLIENT_DIST: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`Cấu hình môi trường không hợp lệ:\n${lines.join('\n')}`);
  process.exit(1);
}

const e = parsed.data;
const MB = 1024 * 1024;

export const env = {
  ...e,
  isProd: e.NODE_ENV === 'production',
  isTest: e.NODE_ENV === 'test',
  uploadDir: path.resolve(process.cwd(), e.UPLOAD_DIR),
  maxFileSize: Math.round(e.MAX_FILE_SIZE_MB * MB),
  defaultQuota: Math.round(e.DEFAULT_QUOTA_MB * MB),
  clientOrigins: e.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
};

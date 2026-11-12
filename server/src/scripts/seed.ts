import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

export const DEMO_ACCOUNTS = [
  { name: 'Quản trị viên', email: 'admin@fileshare.vn', password: 'Admin12345', role: 'admin' as const },
  { name: 'Nguyễn Minh Anh', email: 'demo@fileshare.vn', password: 'Demo12345', role: 'user' as const },
];

/** Tạo tài khoản demo nếu chưa có (an toàn khi chạy nhiều lần). */
export async function seedDemo() {
  for (const a of DEMO_ACCOUNTS) {
    if (await User.exists({ email: a.email })) continue;
    await User.create({
      name: a.name,
      email: a.email,
      passwordHash: await bcrypt.hash(a.password, 12),
      role: a.role,
      storageQuota: env.defaultQuota,
    });
    console.log(`Đã tạo tài khoản ${a.email} / ${a.password}`);
  }
}

// Chạy trực tiếp: npm run seed
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/seed.ts')) {
  await mongoose.connect(env.MONGO_URI);
  await seedDemo();
  await mongoose.disconnect();
}

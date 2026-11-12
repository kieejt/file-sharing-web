import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User, toUserDTO, type UserDoc } from '../models/User.js';
import { Session } from '../models/Session.js';
import { parse } from '../lib/validate.js';
import { conflict, forbidden, unauthorized } from '../lib/errors.js';
import { hashToken, newRefreshToken, signAccessToken } from '../lib/tokens.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const REFRESH_COOKIE = 'fs_refresh';
const BCRYPT_ROUNDS = 12;

const email = z.string().trim().toLowerCase().email('Email không hợp lệ').max(254);
const password = z
  .string()
  .min(8, 'Mật khẩu cần ít nhất 8 ký tự')
  .max(128, 'Mật khẩu quá dài')
  .regex(/[A-Za-z]/, 'Mật khẩu cần có chữ cái')
  .regex(/\d/, 'Mật khẩu cần có chữ số');
const name = z.string().trim().min(1, 'Vui lòng nhập tên').max(80, 'Tên quá dài');

const registerSchema = z.object({ name, email, password });
const loginSchema = z.object({ email, password: z.string().min(1, 'Vui lòng nhập mật khẩu') });
const profileSchema = z.object({ name });
const passwordSchema = z.object({ currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'), newPassword: password });

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_DAYS * 86_400_000,
  };
}

async function issueSession(req: Request, res: Response, user: UserDoc) {
  const { token, hash } = newRefreshToken();
  await Session.create({
    userId: user._id,
    tokenHash: hash,
    userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86_400_000),
  });
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
  return { accessToken: signAccessToken(user.id, user.role), user: toUserDTO(user) };
}

export const authRouter = Router();

authRouter.post('/register', authLimiter, async (req, res) => {
  const body = parse(registerSchema, req.body);
  if (await User.exists({ email: body.email })) throw conflict('Email này đã được đăng ký');
  const isFirst = (await User.estimatedDocumentCount()) === 0;
  const user = await User.create({
    name: body.name,
    email: body.email,
    passwordHash: await bcrypt.hash(body.password, BCRYPT_ROUNDS),
    role: isFirst ? 'admin' : 'user',
    storageQuota: env.defaultQuota,
    lastLoginAt: new Date(),
  });
  res.status(201).json(await issueSession(req, res, user));
});

// Hash giả để so sánh khi email không tồn tại, tránh lộ thông tin qua thời gian phản hồi
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

authRouter.post('/login', authLimiter, async (req, res) => {
  const body = parse(loginSchema, req.body);
  const user = await User.findOne({ email: body.email }).select('+passwordHash');
  const ok = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Email hoặc mật khẩu không đúng');
  if (user.disabled) throw forbidden('Tài khoản đã bị khoá, vui lòng liên hệ quản trị viên');
  user.lastLoginAt = new Date();
  await user.save();
  res.json(await issueSession(req, res, user));
});

authRouter.post('/refresh', async (req, res) => {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized('Phiên đăng nhập đã hết hạn');
  // Xoá ngay token cũ (rotation): một refresh token chỉ dùng được đúng một lần
  const session = await Session.findOneAndDelete({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    throw unauthorized('Phiên đăng nhập đã hết hạn');
  }
  const user = await User.findById(session.userId);
  if (!user || user.disabled) throw unauthorized('Phiên đăng nhập đã hết hạn');
  res.json(await issueSession(req, res, user));
});

authRouter.post('/logout', async (req, res) => {
  const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: toUserDTO(currentUser(req)) });
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const body = parse(profileSchema, req.body);
  const user = currentUser(req);
  user.name = body.name;
  await user.save();
  res.json({ user: toUserDTO(user) });
});

authRouter.post('/password', requireAuth, async (req, res) => {
  const body = parse(passwordSchema, req.body);
  const user = await User.findById(currentUser(req)._id).select('+passwordHash');
  if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
    throw unauthorized('Mật khẩu hiện tại không đúng');
  }
  user.passwordHash = await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS);
  await user.save();
  // Đăng xuất mọi phiên khác, cấp phiên mới cho thiết bị hiện tại
  await Session.deleteMany({ userId: user._id });
  res.json(await issueSession(req, res, user));
});

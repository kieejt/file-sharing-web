import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

const mediaSecret = crypto.createHash('sha256').update(`${env.JWT_SECRET}:media`).digest('hex');
const shareSecret = crypto.createHash('sha256').update(`${env.JWT_SECRET}:share`).digest('hex');

export interface AccessPayload {
  sub: string;
  role: string;
}

export function signAccessToken(userId: string, role: string) {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    audience: 'access',
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const p = jwt.verify(token, env.JWT_SECRET, { audience: 'access' }) as jwt.JwtPayload;
  return { sub: String(p.sub), role: String(p.role) };
}

/** Refresh token dạng chuỗi ngẫu nhiên (opaque), DB chỉ lưu hash. */
export function newRefreshToken() {
  const token = crypto.randomBytes(48).toString('base64url');
  return { token, hash: hashToken(token) };
}
export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

/** Signed URL ngắn hạn cho ảnh/video/tải xuống: dùng được trong <img>, <video>, <a download>. */
export function signMediaToken(fileId: string, ttlSeconds = 3600) {
  return jwt.sign({ f: fileId }, mediaSecret, { expiresIn: ttlSeconds });
}
export function verifyMediaToken(token: string, fileId: string) {
  try {
    const p = jwt.verify(token, mediaSecret) as jwt.JwtPayload;
    return p.f === fileId;
  } catch {
    return false;
  }
}

/** Token mở khoá link chia sẻ có mật khẩu (sống 30 phút). */
export function signShareAccess(shareId: string) {
  return jwt.sign({ s: shareId }, shareSecret, { expiresIn: '30m' });
}
export function verifyShareAccess(token: string | undefined, shareId: string) {
  if (!token) return false;
  try {
    const p = jwt.verify(token, shareSecret) as jwt.JwtPayload;
    return p.s === shareId;
  } catch {
    return false;
  }
}

export const randomShareToken = () => crypto.randomBytes(16).toString('base64url');

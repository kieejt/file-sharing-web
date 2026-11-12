import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/tokens.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { User, type UserDoc } from '../models/User.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized();
  let sub: string;
  try {
    sub = verifyAccessToken(header.slice(7)).sub;
  } catch {
    throw unauthorized('Phiên đăng nhập đã hết hạn');
  }
  const user = await User.findById(sub);
  if (!user) throw unauthorized('Tài khoản không tồn tại');
  if (user.disabled) throw forbidden('Tài khoản đã bị khoá');
  req.user = user;
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') throw forbidden();
  next();
}

/** Lấy user đã xác thực (dùng trong handler sau requireAuth). */
export function currentUser(req: Request): UserDoc {
  if (!req.user) throw unauthorized();
  return req.user;
}

import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const make = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { error: { code: 'RATE_LIMITED', message } },
  });

export const apiLimiter = make(15 * 60_000, 1500, 'Quá nhiều yêu cầu, vui lòng thử lại sau');
// Mỗi thumbnail/ảnh trong lưới là một request, nên tách khỏi apiLimiter để duyệt thư mục nhiều ảnh không ăn hết hạn mức chung
export const mediaLimiter = make(15 * 60_000, 6000, 'Quá nhiều yêu cầu, vui lòng thử lại sau');
export const authLimiter = make(15 * 60_000, 30, 'Bạn thử quá nhiều lần, vui lòng đợi 15 phút');
export const unlockLimiter = make(15 * 60_000, 20, 'Nhập sai mật khẩu quá nhiều lần, vui lòng đợi 15 phút');

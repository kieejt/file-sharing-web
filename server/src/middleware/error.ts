import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy endpoint' } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL';
  let message = 'Đã có lỗi xảy ra, vui lòng thử lại';
  let details: unknown;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File vượt quá giới hạn ${env.MAX_FILE_SIZE_MB} MB`
        : err.code === 'LIMIT_FILE_COUNT'
          ? 'Quá nhiều file trong một lần tải'
          : 'Dữ liệu tải lên không hợp lệ';
  } else if (err instanceof mongoose.Error.CastError) {
    status = 404;
    code = 'NOT_FOUND';
    message = 'Không tìm thấy';
  } else if (err?.code === 11000) {
    status = 409;
    code = 'CONFLICT';
    message = 'Dữ liệu đã tồn tại';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'BAD_JSON';
    message = 'JSON không hợp lệ';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'TOO_LARGE';
    message = 'Dữ liệu gửi lên quá lớn';
  } else if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
    // Lỗi HTTP chuẩn từ thư viện (vd. send/serve-static trả 404, 416)
    status = err.status;
    code = err.status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR';
    message = err.status === 404 ? 'Không tìm thấy' : 'Yêu cầu không hợp lệ';
  }

  if (status >= 500) logger.error({ err, url: req.originalUrl }, 'Unhandled error');
  if (res.headersSent) return;
  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
};

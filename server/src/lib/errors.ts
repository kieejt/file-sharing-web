export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new AppError(400, msg, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'Vui lòng đăng nhập') => new AppError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'Bạn không có quyền thực hiện thao tác này') => new AppError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Không tìm thấy') => new AppError(404, msg, 'NOT_FOUND');
export const conflict = (msg: string) => new AppError(409, msg, 'CONFLICT');
export const gone = (msg: string) => new AppError(410, msg, 'GONE');

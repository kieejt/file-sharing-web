import { z } from 'zod';
import { badRequest } from './errors.js';

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'ID không hợp lệ');

/** Parse dữ liệu theo schema; ném lỗi 400 kèm danh sách trường sai. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    throw badRequest(Object.values(fields)[0] ?? 'Dữ liệu không hợp lệ', { fields });
  }
  return r.data;
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

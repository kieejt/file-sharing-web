import type { FileKind } from '../models/File.js';

const EXT: Record<string, FileKind> = {
  pdf: 'pdf',
  doc: 'document', docx: 'document', odt: 'document', rtf: 'document', pages: 'document',
  xls: 'spreadsheet', xlsx: 'spreadsheet', ods: 'spreadsheet', csv: 'spreadsheet', numbers: 'spreadsheet',
  ppt: 'presentation', pptx: 'presentation', odp: 'presentation', key: 'presentation',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive', bz2: 'archive', xz: 'archive',
  js: 'code', ts: 'code', jsx: 'code', tsx: 'code', py: 'code', java: 'code', c: 'code', cpp: 'code', h: 'code',
  cs: 'code', go: 'code', rs: 'code', php: 'code', rb: 'code', sh: 'code', sql: 'code', html: 'code', css: 'code',
  json: 'code', xml: 'code', yml: 'code', yaml: 'code', kt: 'code', swift: 'code',
  txt: 'text', md: 'text', log: 'text',
};

export function extOf(name: string) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function detectKind(name: string, mime: string): FileKind {
  const byExt = EXT[extOf(name)];
  if (byExt) return byExt;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/')) return 'text';
  return 'other';
}

/**
 * Các kiểu được phép hiển thị trực tiếp (inline) trên trình duyệt.
 * HTML, SVG, XML... luôn bị ép tải xuống để tránh XSS từ file người dùng tải lên.
 */
const INLINE_MIME: Record<string, string> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
  'image/avif': 'image/avif',
  'image/bmp': 'image/bmp',
  'application/pdf': 'application/pdf',
  'video/mp4': 'video/mp4',
  'video/webm': 'video/webm',
  'video/ogg': 'video/ogg',
  'audio/mpeg': 'audio/mpeg',
  'audio/ogg': 'audio/ogg',
  'audio/wav': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/webm': 'audio/webm',
  'audio/mp4': 'audio/mp4',
  'audio/aac': 'audio/aac',
  'audio/flac': 'audio/flac',
};

/** Trả về content-type an toàn để hiển thị inline, hoặc null nếu phải tải xuống. */
export function safeInlineType(mime: string, kind: FileKind): string | null {
  if (INLINE_MIME[mime]) return INLINE_MIME[mime]!;
  if (kind === 'text' || kind === 'code' || mime === 'text/csv') return 'text/plain; charset=utf-8';
  return null;
}

export const THUMBNAIL_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);

import type { FileKind } from './types';
import { splitName } from './format';

/** Đoán loại file ở phía client (dùng cho hàng chờ tải lên), khớp với logic server. */
const EXT: Record<string, FileKind> = {
  pdf: 'pdf',
  doc: 'document', docx: 'document', odt: 'document', rtf: 'document',
  xls: 'spreadsheet', xlsx: 'spreadsheet', ods: 'spreadsheet', csv: 'spreadsheet',
  ppt: 'presentation', pptx: 'presentation', odp: 'presentation',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  js: 'code', ts: 'code', tsx: 'code', jsx: 'code', py: 'code', java: 'code', json: 'code', html: 'code', css: 'code', sql: 'code',
  txt: 'text', md: 'text', log: 'text',
};

export function detectKind(name: string, mime: string): FileKind {
  const k = EXT[splitName(name).ext.toLowerCase()];
  if (k) return k;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'other';
}

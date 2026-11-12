import type { FileKind } from './types';
import { splitName } from './format';

export type Tone = 'blue' | 'red' | 'green' | 'yellow' | 'stone';

export const KIND_META: Record<FileKind, { label: string; tone: Tone; fallback: string }> = {
  image: { label: 'Hình ảnh', tone: 'blue', fallback: 'IMG' },
  video: { label: 'Video', tone: 'red', fallback: 'VID' },
  audio: { label: 'Âm thanh', tone: 'yellow', fallback: 'AUD' },
  pdf: { label: 'PDF', tone: 'red', fallback: 'PDF' },
  document: { label: 'Văn bản', tone: 'blue', fallback: 'DOC' },
  spreadsheet: { label: 'Bảng tính', tone: 'green', fallback: 'XLS' },
  presentation: { label: 'Trình chiếu', tone: 'yellow', fallback: 'PPT' },
  archive: { label: 'Nén', tone: 'stone', fallback: 'ZIP' },
  code: { label: 'Mã nguồn', tone: 'stone', fallback: 'CODE' },
  text: { label: 'Văn bản thô', tone: 'stone', fallback: 'TXT' },
  other: { label: 'Khác', tone: 'stone', fallback: 'FILE' },
};

/** Nhãn hiển thị trên ô loại file: đuôi file thật, tối đa 4 ký tự. */
export function badgeText(name: string, kind: FileKind) {
  const { ext } = splitName(name);
  const e = ext.toUpperCase();
  return e && e.length <= 4 ? e : KIND_META[kind].fallback;
}

export const KIND_FILTERS: { value: FileKind | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'document', label: 'Văn bản' },
  { value: 'pdf', label: 'PDF' },
  { value: 'spreadsheet', label: 'Bảng tính' },
  { value: 'presentation', label: 'Trình chiếu' },
  { value: 'image', label: 'Hình ảnh' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Âm thanh' },
  { value: 'archive', label: 'Nén' },
  { value: 'code', label: 'Mã nguồn' },
];

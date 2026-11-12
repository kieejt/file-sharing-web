const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number, digits = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  const rounded = i === 0 ? String(Math.round(v)) : v.toFixed(v >= 100 ? 0 : digits).replace(/\.0+$/, '');
  return `${rounded.replace('.', ',')} ${UNITS[i]}`;
}

const dateFmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short' });

export const formatDate = (d: string | Date) => dateFmt.format(new Date(d));
export const formatDateTime = (d: string | Date) => fullFmt.format(new Date(d));

/** "Vừa xong", "5 phút trước", "Hôm qua 14:20", hoặc ngày cụ thể. */
export function formatRelative(d: string | Date, now = new Date()) {
  const date = new Date(d);
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 45) return 'Vừa xong';
  if (diff < 3600) return `${Math.round(diff / 60)} phút trước`;
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `${Math.round(diff / 3600)} giờ trước`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Hôm qua ${timeFmt.format(date)}`;
  return dateFmt.format(date);
}

/** Thời gian còn lại tới mốc hết hạn: "còn 3 ngày", "còn 5 giờ". */
export function formatRemaining(d: string | Date, now = new Date()) {
  const ms = new Date(d).getTime() - now.getTime();
  if (ms <= 0) return 'đã hết hạn';
  const h = ms / 3_600_000;
  if (h < 1) return `còn ${Math.max(1, Math.round(ms / 60_000))} phút`;
  if (h < 48) return `còn ${Math.round(h)} giờ`;
  return `còn ${Math.round(h / 24)} ngày`;
}

export const formatNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

export function splitName(name: string) {
  const i = name.lastIndexOf('.');
  if (i <= 0 || i === name.length - 1) return { base: name, ext: '' };
  return { base: name.slice(0, i), ext: name.slice(i + 1) };
}

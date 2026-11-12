import type { PipelineStage, Types } from 'mongoose';
import { Activity } from '../models/Activity.js';
import { File } from '../models/File.js';

export const TZ = 'Asia/Ho_Chi_Minh';
const DAY = 86_400_000;

function dayKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Chuỗi N ngày gần nhất (kể cả hôm nay) với số lượt upload / tải / xem theo từng ngày. */
export async function dailyActivity(match: { userId?: Types.ObjectId }, days = 30) {
  const since = new Date(Date.now() - (days - 1) * DAY);
  since.setHours(0, 0, 0, 0);
  const pipeline: PipelineStage[] = [
    { $match: { ...match, createdAt: { $gte: new Date(since.getTime() - DAY) } } },
    {
      $group: {
        _id: { d: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, t: '$type' },
        n: { $sum: 1 },
        bytes: { $sum: '$bytes' },
      },
    },
  ];
  const rows = await Activity.aggregate<{ _id: { d: string; t: string }; n: number; bytes: number }>(pipeline);
  const map = new Map<string, { date: string; uploads: number; downloads: number; views: number; uploadBytes: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(new Date(Date.now() - i * DAY));
    map.set(k, { date: k, uploads: 0, downloads: 0, views: 0, uploadBytes: 0 });
  }
  for (const r of rows) {
    const e = map.get(r._id.d);
    if (!e) continue;
    if (r._id.t === 'upload') {
      e.uploads += r.n;
      e.uploadBytes += r.bytes;
    } else if (r._id.t === 'download' || r._id.t === 'share_download') e.downloads += r.n;
    else if (r._id.t === 'share_view') e.views += r.n;
  }
  return [...map.values()];
}

export async function kindBreakdown(match: { userId?: Types.ObjectId }) {
  const rows = await File.aggregate<{ _id: string; count: number; size: number }>([
    { $match: { ...match, trashedAt: null } },
    { $group: { _id: '$kind', count: { $sum: 1 }, size: { $sum: '$size' } } },
    { $sort: { size: -1 } },
  ]);
  return rows.map((r) => ({ kind: r._id, count: r.count, size: r.size }));
}

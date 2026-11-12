import { Schema, model } from 'mongoose';

export const ACTIVITY_TYPES = ['upload', 'download', 'share_view', 'share_download'] as const;

/** Nhật ký hoạt động phục vụ thống kê. Tự xoá sau 180 ngày. */
const activitySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileId: { type: Schema.Types.ObjectId, ref: 'File', default: null },
  type: { type: String, enum: ACTIVITY_TYPES, required: true },
  bytes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export const Activity = model('Activity', activitySchema);

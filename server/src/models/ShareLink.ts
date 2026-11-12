import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const shareSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    passwordHash: { type: String, default: null, select: false },
    expiresAt: { type: Date, default: null },
    maxDownloads: { type: Number, default: null },
    downloadCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type ShareDoc = HydratedDocument<InferSchemaType<typeof shareSchema>>;
export const ShareLink = model('ShareLink', shareSchema);

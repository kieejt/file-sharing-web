import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** Phiên tải lên theo từng đoạn. File tạm `storageKey` là nguồn sự thật cho số byte đã nhận. */
const uploadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    storageKey: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

export type UploadDoc = HydratedDocument<InferSchemaType<typeof uploadSchema>>;
export const Upload = model('Upload', uploadSchema);

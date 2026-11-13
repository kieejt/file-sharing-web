import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { normalizeName } from '../lib/validate.js';

export const FILE_KINDS = ['image', 'video', 'audio', 'pdf', 'document', 'spreadsheet', 'presentation', 'archive', 'code', 'text', 'other'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

const fileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    nameNorm: { type: String },
    description: { type: String, default: '', maxlength: 2000 },
    mimeType: { type: String, required: true },
    kind: { type: String, enum: FILE_KINDS, required: true },
    size: { type: Number, required: true, min: 0 },
    storageKey: { type: String, required: true },
    thumbKey: { type: String, default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    downloadCount: { type: Number, default: 0 },
    trashedAt: { type: Date, default: null },
    trashBatch: { type: String, default: null },
    trashRoot: { type: Boolean, default: false },
  },
  { timestamps: true },
);
fileSchema.pre('save', function () {
  if (this.isNew || this.isModified('name')) this.nameNorm = normalizeName(this.name);
});
fileSchema.index({ userId: 1, folderId: 1, trashedAt: 1, createdAt: -1 });
fileSchema.index({ userId: 1, trashBatch: 1 });
fileSchema.index({ userId: 1, kind: 1 });

export type FileDoc = HydratedDocument<InferSchemaType<typeof fileSchema>>;
export const File = model('File', fileSchema);

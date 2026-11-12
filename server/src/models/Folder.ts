import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const folderSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    /** Danh sách thư mục tổ tiên (gốc -> cha trực tiếp), giúp truy vấn cả cây con nhanh. */
    ancestors: { type: [Schema.Types.ObjectId], default: [] },
    trashedAt: { type: Date, default: null },
    trashBatch: { type: String, default: null },
    trashRoot: { type: Boolean, default: false },
  },
  { timestamps: true },
);
folderSchema.index({ userId: 1, parentId: 1, trashedAt: 1 });
folderSchema.index({ userId: 1, ancestors: 1 });
folderSchema.index({ userId: 1, trashBatch: 1 });

export type FolderDoc = HydratedDocument<InferSchemaType<typeof folderSchema>>;
export const Folder = model('Folder', folderSchema);

export function toFolderDTO(f: FolderDoc) {
  return {
    id: f.id as string,
    name: f.name,
    parentId: f.parentId ? String(f.parentId) : null,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    trashedAt: f.trashedAt,
  };
}

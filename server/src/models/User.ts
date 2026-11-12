import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    storageQuota: { type: Number, required: true },
    storageUsed: { type: Number, default: 0, min: 0 },
    disabled: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);

export function toUserDTO(u: UserDoc) {
  return {
    id: u.id as string,
    name: u.name,
    email: u.email,
    role: u.role,
    storageQuota: u.storageQuota,
    storageUsed: u.storageUsed,
    disabled: u.disabled,
    createdAt: u.createdAt,
  };
}

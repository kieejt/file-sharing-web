export type Role = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  storageQuota: number;
  storageUsed: number;
  disabled: boolean;
  createdAt: string;
}

export type FileKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'code'
  | 'text'
  | 'other';

export interface FileItem {
  id: string;
  name: string;
  description: string;
  mimeType: string;
  kind: FileKind;
  size: number;
  folderId: string | null;
  downloadCount: number;
  previewable: boolean;
  thumbUrl: string | null;
  createdAt: string;
  updatedAt: string;
  trashedAt: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Crumb {
  id: string;
  name: string;
}

export interface DriveListing {
  folder: Folder | null;
  breadcrumbs: Crumb[];
  folders: Folder[];
  files: FileItem[];
  totalFiles: number;
  page: number;
  hasMore: boolean;
}

export interface FileLinks {
  viewUrl: string;
  downloadUrl: string;
}

export type ShareStatus = 'active' | 'expired' | 'exhausted' | 'revoked';

export interface Share {
  id: string;
  token: string;
  path: string;
  access: 'public' | 'private';
  expiresAt: string | null;
  maxDownloads: number | null;
  downloadCount: number;
  viewCount: number;
  status: ShareStatus;
  createdAt: string;
  file?: { id: string; name: string; kind: FileKind; size: number };
}

export type TrashItem =
  | {
      type: 'folder';
      batch: string;
      id: string;
      name: string;
      size: number;
      itemCount: number;
      trashedAt: string;
    }
  | ({ type: 'file'; batch: string; trashedAt: string } & Omit<FileItem, 'trashedAt'>);

export interface DailyPoint {
  date: string;
  uploads: number;
  downloads: number;
  views: number;
  uploadBytes: number;
}

export interface KindStat {
  kind: FileKind;
  count: number;
  size: number;
}

export interface Stats {
  storage: { used: number; quota: number; trash: number };
  counts: { files: number; folders: number; trashFiles: number; downloads: number; activeShares: number };
  byKind: KindStat[];
  daily: DailyPoint[];
  topFiles: { id: string; name: string; kind: FileKind; size: number; downloadCount: number }[];
}

export interface AdminUser extends User {
  fileCount: number;
  lastLoginAt: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface PublicShare {
  requiresPassword: boolean;
  share?: { expiresAt: string | null; remainingDownloads: number | null; ownerName: string; createdAt: string };
  file?: { name: string; size: number; kind: FileKind; mimeType: string; previewable: boolean; thumbUrl: string | null };
}

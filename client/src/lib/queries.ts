import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  AdminUser,
  DailyPoint,
  DriveListing,
  FileItem,
  FileKind,
  FileLinks,
  Crumb,
  KindStat,
  Paged,
  Share,
  Stats,
  TrashItem,
  User,
} from './types';

export type SortKey = 'name' | 'createdAt' | 'size';
export type SortOrder = 'asc' | 'desc';

/* ----------------------------------------------------------------- drive */

export function useDrive(folderId: string | undefined, sort: SortKey, order: SortOrder) {
  return useQuery({
    queryKey: ['drive', folderId ?? 'root', sort, order],
    queryFn: async () =>
      (await api.get<DriveListing>('/drive', { params: { folderId: folderId ?? 'root', sort, order } })).data,
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[1] === (folderId ?? 'root') ? prev : undefined),
  });
}

export function useFileSearch(params: { q?: string; kind?: FileKind | ''; page: number; sort: SortKey; order: SortOrder }) {
  return useQuery({
    queryKey: ['files', params],
    queryFn: async () =>
      (
        await api.get<Paged<FileItem>>('/files', {
          params: { ...params, q: params.q || undefined, kind: params.kind || undefined, limit: 30 },
        })
      ).data,
    placeholderData: keepPreviousData,
  });
}

export function useFileDetail(id: string | null) {
  return useQuery({
    queryKey: ['file', id],
    queryFn: async () =>
      (await api.get<{ file: FileItem; links: FileLinks; breadcrumbs: Crumb[] }>(`/files/${id}`)).data,
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useFolderTree(enabled = true) {
  return useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: async () => (await api.get<{ folders: { id: string; name: string; parentId: string | null }[] }>('/folders/tree')).data.folders,
    enabled,
  });
}

export const getLinks = async (id: string) => (await api.get<FileLinks>(`/files/${id}/links`)).data;

/** Làm mới mọi dữ liệu phụ thuộc vào danh sách file. */
export function useInvalidateDrive() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['drive'] }),
      qc.invalidateQueries({ queryKey: ['files'] }),
      qc.invalidateQueries({ queryKey: ['folders'] }),
      qc.invalidateQueries({ queryKey: ['trash'] }),
      qc.invalidateQueries({ queryKey: ['stats'] }),
      qc.invalidateQueries({ queryKey: ['shares'] }),
      qc.invalidateQueries({ queryKey: ['me'] }),
      qc.invalidateQueries({ queryKey: ['file'] }),
    ]);
}

export function useDriveMutations() {
  const invalidate = useInvalidateDrive();
  const opts = { onSuccess: invalidate };
  return {
    createFolder: useMutation({
      mutationFn: (v: { name: string; parentId: string | null }) => api.post('/folders', v),
      ...opts,
    }),
    renameFolder: useMutation({
      mutationFn: (v: { id: string; name: string }) => api.patch(`/folders/${v.id}`, { name: v.name }),
      ...opts,
    }),
    updateFile: useMutation({
      mutationFn: (v: { id: string; name?: string; description?: string }) =>
        api.patch<{ file: FileItem }>(`/files/${v.id}`, { name: v.name, description: v.description }),
      ...opts,
    }),
    move: useMutation({
      mutationFn: (v: { fileIds: string[]; folderIds: string[]; targetId: string }) => api.post('/drive/move', v),
      ...opts,
    }),
    trash: useMutation({
      mutationFn: (v: { fileIds: string[]; folderIds: string[] }) => api.post('/drive/trash', v),
      ...opts,
    }),
  };
}

/* ---------------------------------------------------------------- shares */

export function useFileShares(fileId: string | null) {
  return useQuery({
    queryKey: ['shares', 'file', fileId],
    queryFn: async () => (await api.get<{ shares: Share[] }>(`/files/${fileId}/shares`)).data.shares,
    enabled: !!fileId,
  });
}

export function useMyShares() {
  return useQuery({
    queryKey: ['shares', 'mine'],
    queryFn: async () => (await api.get<{ shares: Share[] }>('/shares')).data.shares,
  });
}

export function useShareMutations() {
  const qc = useQueryClient();
  const onSuccess = () => Promise.all([qc.invalidateQueries({ queryKey: ['shares'] }), qc.invalidateQueries({ queryKey: ['stats'] })]);
  return {
    create: useMutation({
      mutationFn: async (v: { fileId: string; expiresInHours: number | null; password: string | null; maxDownloads: number | null }) =>
        (await api.post<{ share: Share }>(`/files/${v.fileId}/shares`, v)).data.share,
      onSuccess,
    }),
    revoke: useMutation({ mutationFn: (id: string) => api.delete(`/shares/${id}`), onSuccess }),
  };
}

/* ----------------------------------------------------------------- trash */

export function useTrash() {
  return useQuery({
    queryKey: ['trash'],
    queryFn: async () => (await api.get<{ items: TrashItem[]; retentionDays: number }>('/trash')).data,
  });
}

export function useTrashMutations() {
  const invalidate = useInvalidateDrive();
  return {
    restore: useMutation({ mutationFn: (batch: string) => api.post(`/trash/${batch}/restore`), onSuccess: invalidate }),
    purge: useMutation({ mutationFn: (batch: string) => api.delete(`/trash/${batch}`), onSuccess: invalidate }),
    empty: useMutation({ mutationFn: async () => (await api.delete<{ freed: number }>('/trash')).data, onSuccess: invalidate }),
  };
}

/* ----------------------------------------------------------------- stats */

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: async () => (await api.get<Stats>('/stats')).data });
}

/* ----------------------------------------------------------------- admin */

export interface AdminOverview {
  counts: { users: number; activeUsers: number; files: number };
  storage: { used: number; allocated: number };
  byKind: KindStat[];
  daily: DailyPoint[];
}

export function useAdminOverview() {
  return useQuery({ queryKey: ['admin', 'overview'], queryFn: async () => (await api.get<AdminOverview>('/admin/overview')).data });
}

export function useAdminUsers(q: string, page: number) {
  return useQuery({
    queryKey: ['admin', 'users', q, page],
    queryFn: async () => (await api.get<Paged<AdminUser>>('/admin/users', { params: { q: q || undefined, page } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useAdminMutations() {
  const qc = useQueryClient();
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['admin'] });
  return {
    update: useMutation({
      mutationFn: (v: { id: string; role?: 'user' | 'admin'; disabled?: boolean; storageQuotaMb?: number }) =>
        api.patch<{ user: User }>(`/admin/users/${v.id}`, { role: v.role, disabled: v.disabled, storageQuotaMb: v.storageQuotaMb }),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.delete(`/admin/users/${id}`), onSuccess }),
  };
}

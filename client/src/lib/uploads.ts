import { useSyncExternalStore } from 'react';
import { api, errorMessage, errorStatus } from './api';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'canceled';

export interface UploadItem {
  id: string;
  file: File;
  folderId: string | null;
  loaded: number;
  status: UploadStatus;
  error?: string;
  /** Phiên tải theo đoạn trên máy chủ, giữ lại để bấm "Thử lại" thì tiếp tục từ chỗ đã nhận. */
  uploadId?: string;
}

const CONCURRENCY = 3;
// File lớn gửi theo từng đoạn để rớt mạng chỉ phải gửi lại đoạn dở, file nhỏ vẫn một request như cũ
const CHUNK_THRESHOLD = 8 * 1024 * 1024;
const CHUNK_SIZE = 4 * 1024 * 1024;
const CHUNK_RETRIES = 5;

let items: UploadItem[] = [];
const controllers = new Map<string, AbortController>();
const listeners = new Set<() => void>();
let onFileDone: (() => void) | null = null;

function emit() {
  items = [...items];
  listeners.forEach((l) => l());
}

function patch(id: string, p: Partial<UploadItem>) {
  const i = items.findIndex((x) => x.id === id);
  if (i === -1) return;
  items[i] = { ...items[i]!, ...p };
  emit();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function uploadChunked(item: UploadItem, signal: AbortSignal) {
  const { file } = item;
  const received = async (id: string) => (await api.get<{ received: number }>(`/files/uploads/${id}`, { signal })).data.received;

  let id = item.uploadId;
  let offset = 0;
  if (id) {
    try {
      offset = await received(id);
    } catch (err) {
      if (errorStatus(err) !== 404) throw err;
      id = undefined; // phiên đã hết hạn hoặc bị huỷ: tạo phiên mới
    }
  }
  if (!id) {
    const r = await api.post<{ upload: { id: string } }>(
      '/files/uploads',
      { name: file.name, size: file.size, mimeType: file.type || undefined, folderId: item.folderId },
      { signal },
    );
    id = r.data.upload.id;
    patch(item.id, { uploadId: id });
  }

  let failures = 0;
  while (offset < file.size) {
    const from = offset;
    try {
      const r = await api.put<{ received: number }>(`/files/uploads/${id}`, file.slice(from, from + CHUNK_SIZE), {
        params: { offset: from },
        headers: { 'Content-Type': 'application/octet-stream' },
        signal,
        onUploadProgress: (e) => patch(item.id, { loaded: from + e.loaded }),
      });
      offset = r.data.received;
      failures = 0;
    } catch (err) {
      const status = errorStatus(err);
      // Lỗi 4xx (hết dung lượng, quá lớn...) thử lại cũng vô ích; riêng 409 là lệch vị trí nên chỉ cần đồng bộ lại
      if (signal.aborted || (status && status < 500 && status !== 409) || ++failures > CHUNK_RETRIES) throw err;
      await sleep(Math.min(1000 * 2 ** failures, 15_000));
      if (signal.aborted) throw err;
      try {
        offset = await received(id);
      } catch {
        // Mạng chưa lên lại: vòng sau sẽ gửi lại đoạn này và tiếp tục tính lần lỗi
      }
    }
  }
  await api.post(`/files/uploads/${id}/complete`, null, { signal });
}

async function run(item: UploadItem) {
  const ctrl = new AbortController();
  controllers.set(item.id, ctrl);
  patch(item.id, { status: 'uploading', loaded: 0, error: undefined });
  try {
    if (item.file.size > CHUNK_THRESHOLD) {
      await uploadChunked(item, ctrl.signal);
    } else {
      const form = new FormData();
      if (item.folderId) form.append('folderId', item.folderId);
      form.append('files', item.file, item.file.name);
      await api.post('/files/upload', form, {
        signal: ctrl.signal,
        onUploadProgress: (e) => patch(item.id, { loaded: e.loaded }),
      });
    }
    patch(item.id, { status: 'done', loaded: item.file.size, uploadId: undefined });
    onFileDone?.();
  } catch (err) {
    if (ctrl.signal.aborted) {
      patch(item.id, { status: 'canceled' });
      const id = items.find((i) => i.id === item.id)?.uploadId;
      if (id) {
        void api.delete(`/files/uploads/${id}`).catch(() => undefined);
        patch(item.id, { uploadId: undefined });
      }
    } else patch(item.id, { status: 'error', error: errorMessage(err, 'Tải lên thất bại') });
  } finally {
    controllers.delete(item.id);
    pump();
  }
}

function pump() {
  const active = items.filter((i) => i.status === 'uploading').length;
  const next = items.filter((i) => i.status === 'queued').slice(0, Math.max(0, CONCURRENCY - active));
  next.forEach((i) => void run(i));
}

export const uploads = {
  add(files: File[], folderId: string | null) {
    const added = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      folderId,
      loaded: 0,
      status: 'queued' as const,
    }));
    items = [...items, ...added];
    emit();
    pump();
  },
  cancel(id: string) {
    const c = controllers.get(id);
    if (c) c.abort();
    else patch(id, { status: 'canceled' });
  },
  retry(id: string) {
    patch(id, { status: 'queued', error: undefined, loaded: 0 });
    pump();
  },
  clearFinished() {
    items = items.filter((i) => i.status === 'queued' || i.status === 'uploading');
    emit();
  },
  setOnFileDone(fn: () => void) {
    onFileDone = fn;
  },
};

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useUploads() {
  return useSyncExternalStore(subscribe, () => items);
}

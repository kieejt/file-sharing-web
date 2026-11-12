import { useSyncExternalStore } from 'react';
import { api, errorMessage } from './api';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error' | 'canceled';

export interface UploadItem {
  id: string;
  file: File;
  folderId: string | null;
  loaded: number;
  status: UploadStatus;
  error?: string;
}

const CONCURRENCY = 3;

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

async function run(item: UploadItem) {
  const ctrl = new AbortController();
  controllers.set(item.id, ctrl);
  patch(item.id, { status: 'uploading', loaded: 0, error: undefined });
  const form = new FormData();
  if (item.folderId) form.append('folderId', item.folderId);
  form.append('files', item.file, item.file.name);
  try {
    await api.post('/files/upload', form, {
      signal: ctrl.signal,
      onUploadProgress: (e) => patch(item.id, { loaded: e.loaded }),
    });
    patch(item.id, { status: 'done', loaded: item.file.size });
    onFileDone?.();
  } catch (err) {
    if (ctrl.signal.aborted) patch(item.id, { status: 'canceled' });
    else patch(item.id, { status: 'error', error: errorMessage(err, 'Tải lên thất bại') });
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

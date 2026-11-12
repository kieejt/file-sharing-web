import { useSyncExternalStore } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'fs-theme';
const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let pref: ThemePref = read();
const listeners = new Set<() => void>();

function apply() {
  const dark = pref === 'dark' || (pref === 'system' && !!mq?.matches);
  document.documentElement.classList.toggle('dark', dark);
}

mq?.addEventListener('change', () => pref === 'system' && apply());

function setTheme(p: ThemePref) {
  pref = p;
  try {
    if (p === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch {
    /* bỏ qua khi trình duyệt chặn storage */
  }
  apply();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Một nguồn trạng thái giao diện dùng chung cho toàn ứng dụng. */
export function useTheme() {
  const value = useSyncExternalStore(subscribe, () => pref);
  return { pref: value, set: setTheme };
}

import { useCallback, useState } from 'react';

/** State lưu trong localStorage cho các tuỳ chọn hiển thị của từng người xem (dạng xem, sắp xếp). */
export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* trình duyệt chặn storage: chỉ giữ trong phiên */
      }
    },
    [key],
  );
  return [value, set] as const;
}

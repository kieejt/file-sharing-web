import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { User } from './types';

/**
 * Access token chỉ giữ trong bộ nhớ (không localStorage) để giảm rủi ro XSS.
 * Refresh token nằm trong cookie httpOnly, trình duyệt tự gửi tới /api/auth.
 */
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const setSessionExpiredHandler = (fn: () => void) => {
  onSessionExpired = fn;
};

export const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// Gộp các lần refresh đồng thời thành một request duy nhất
let refreshing: Promise<AuthResponse> | null = null;
export function refreshSession() {
  refreshing ??= axios
    .post<AuthResponse>('/api/auth/refresh', null, { withCredentials: true })
    .then((r) => {
      if (r.status === 204 || !r.data?.accessToken) throw new Error('NO_SESSION');
      setAccessToken(r.data.accessToken);
      return r.data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
  const isAuthCall = original?.url?.startsWith('/auth/');
  const isPublic = original?.url?.startsWith('/public/');
  // Chỉ thử làm mới phiên khi người dùng đang đăng nhập (có access token)
  if (error.response?.status === 401 && original && !original._retried && !isAuthCall && !isPublic && accessToken) {
    original._retried = true;
    try {
      await refreshSession();
      return api(original);
    } catch {
      setAccessToken(null);
      onSessionExpired?.();
    }
  }
  throw error;
});

/** Lấy thông báo lỗi tiếng Việt từ response của API. */
export function errorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại') {
  if (axios.isCancel(err)) return 'Đã huỷ';
  if (err instanceof AxiosError) {
    const msg = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (msg) return msg;
    if (!err.response) return 'Không kết nối được máy chủ';
  }
  return fallback;
}

export function fieldErrors(err: unknown): Record<string, string> {
  if (err instanceof AxiosError) {
    const d = (err.response?.data as { error?: { details?: { fields?: Record<string, string> } } } | undefined)?.error;
    return d?.details?.fields ?? {};
  }
  return {};
}

export function errorStatus(err: unknown) {
  return err instanceof AxiosError ? err.response?.status : undefined;
}

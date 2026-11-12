import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, refreshSession, setAccessToken, setSessionExpiredHandler, type AuthResponse } from './api';
import type { User } from './types';

type Status = 'loading' | 'authed' | 'guest';

interface AuthContextValue {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Cập nhật phiên sau khi đổi mật khẩu (server cấp token mới). */
  adoptSession: (r: AuthResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');

  const adoptSession = useCallback(
    (r: AuthResponse) => {
      setAccessToken(r.accessToken);
      qc.setQueryData(['me'], r.user);
      setStatus('authed');
    },
    [qc],
  );

  const toGuest = useCallback(() => {
    setAccessToken(null);
    qc.clear();
    setStatus('guest');
  }, [qc]);

  // Khôi phục phiên từ cookie refresh khi tải trang
  useEffect(() => {
    let alive = true;
    refreshSession()
      .then((r) => alive && adoptSession(r))
      .catch(() => alive && setStatus('guest'));
    setSessionExpiredHandler(() => {
      toGuest();
      toast.info('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    });
    return () => {
      alive = false;
    };
  }, [adoptSession, toGuest]);

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<{ user: User }>('/auth/me')).data.user,
    enabled: status === 'authed',
    staleTime: 30_000,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: status === 'authed' ? (me.data ?? null) : null,
      adoptSession,
      async login(email, password) {
        const r = (await api.post<AuthResponse>('/auth/login', { email, password })).data;
        adoptSession(r);
        return r.user;
      },
      async register(name, email, password) {
        const r = (await api.post<AuthResponse>('/auth/register', { name, email, password })).data;
        adoptSession(r);
        return r.user;
      },
      async logout() {
        try {
          await api.post('/auth/logout');
        } finally {
          toGuest();
        }
      },
    }),
    [status, me.data, adoptSession, toGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

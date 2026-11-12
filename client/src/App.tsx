import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/auth';
import { uploads } from './lib/uploads';
import { useInvalidateDrive } from './lib/queries';
import { ConfirmProvider } from './components/confirm';
import { AppShell } from './layouts/AppShell';
import { Button, Skeleton } from './components/ui';
import { LogoMark } from './components/Logo';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Drive = lazy(() => import('./pages/Drive'));
const FileSearch = lazy(() => import('./pages/FileSearch'));
const Shared = lazy(() => import('./pages/Shared'));
const Trash = lazy(() => import('./pages/Trash'));
const Stats = lazy(() => import('./pages/Stats'));
const Admin = lazy(() => import('./pages/Admin'));
const Settings = lazy(() => import('./pages/Settings'));
const PublicShare = lazy(() => import('./pages/PublicShare'));
const NotFound = lazy(() => import('./pages/NotFound'));

function BootScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center" aria-busy="true" aria-label="Đang tải">
      <span className="skeleton rounded-[8px] bg-transparent">
        <LogoMark size={36} />
      </span>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="space-y-2 pt-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

function RequireAuth({ admin }: { admin?: boolean }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading' || (status === 'authed' && !user)) return <BootScreen />;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user?.role !== 'admin') return <Navigate to="/drive" replace />;
  return <Outlet />;
}

function GuestOnly() {
  const { status } = useAuth();
  if (status === 'loading') return <BootScreen />;
  if (status === 'authed') return <Navigate to="/drive" replace />;
  return <Outlet />;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-lg font-semibold text-ink">Trang gặp sự cố khi hiển thị</h1>
        <p className="max-w-sm text-ink-2">Bạn thử tải lại trang. Nếu vẫn lỗi, hãy quay về trang chủ.</p>
        <Button variant="primary" onClick={() => location.assign('/')}>
          Về trang chủ
        </Button>
      </div>
    );
  }
}

function UploadSync() {
  const invalidate = useInvalidateDrive();
  const { status } = useAuth();
  useEffect(() => {
    uploads.setOnFileDone(() => void invalidate());
  }, [invalidate]);

  // Tải trước mã các trang trong ứng dụng khi trình duyệt rảnh: lần chuyển trang đầu tiên hiện ngay
  useEffect(() => {
    if (status !== 'authed') return;
    const load = () => {
      void import('./pages/Drive');
      void import('./pages/FileSearch');
      void import('./pages/Shared');
      void import('./pages/Trash');
      void import('./pages/Stats');
      void import('./pages/Settings');
    };
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const id = ric(load);
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id);
  }, [status]);
  return null;
}

function ShellWithSuspense() {
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ConfirmProvider>
            <UploadSync />
            <Suspense fallback={<BootScreen />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/s/:token" element={<PublicShare />} />
                <Route element={<GuestOnly />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>
                <Route element={<RequireAuth />}>
                  <Route element={<ShellWithSuspense />}>
                    <Route path="/drive" element={<Drive />} />
                    <Route path="/drive/:folderId" element={<Drive />} />
                    <Route path="/recent" element={<FileSearch mode="recent" />} />
                    <Route path="/search" element={<FileSearch mode="search" />} />
                    <Route path="/shared" element={<Shared />} />
                    <Route path="/trash" element={<Trash />} />
                    <Route path="/stats" element={<Stats />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                </Route>
                <Route element={<RequireAuth admin />}>
                  <Route element={<ShellWithSuspense />}>
                    <Route path="/admin" element={<Admin />} />
                  </Route>
                </Route>
                <Route path="/app" element={<Navigate to="/drive" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Toaster
              position="bottom-center"
              toastOptions={{
                className: '!rounded-box !border !border-line !bg-surface !text-ink !shadow-pop !font-sans !text-[13px]',
              }}
            />
          </ConfirmProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

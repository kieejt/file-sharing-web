import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import * as RDialog from '@radix-ui/react-dialog';
import {
  ChartBar,
  ClockCounterClockwise,
  Desktop,
  FolderSimple,
  GearSix,
  LinkSimple,
  List,
  MagnifyingGlass,
  Moon,
  ShieldCheck,
  SignOut,
  Sun,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { uploads } from '@/lib/uploads';
import { formatBytes } from '@/lib/format';
import { Logo } from '@/components/Logo';
import { UploadPanel } from '@/components/UploadPanel';
import { Button, IconButton, Kbd, Menu, Meter, cx } from '@/components/ui';

/* Thư mục đang mở, để nút "Tải lên" ở thanh trên biết đích đến */
const FolderCtx = createContext<{ folderId: string | null; setFolderId: (id: string | null) => void }>({
  folderId: null,
  setFolderId: () => {},
});
export const useCurrentFolder = () => useContext(FolderCtx);

const NAV = [
  { to: '/drive', label: 'Tệp của tôi', icon: FolderSimple },
  { to: '/recent', label: 'Gần đây', icon: ClockCounterClockwise },
  { to: '/shared', label: 'Đã chia sẻ', icon: LinkSimple },
  { to: '/trash', label: 'Thùng rác', icon: Trash },
  { to: '/stats', label: 'Thống kê', icon: ChartBar },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts.length > 1 ? parts[parts.length - 2]![0]! : '') + parts[parts.length - 1]![0]!).toUpperCase();
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const items = user?.role === 'admin' ? [...NAV, { to: '/admin', label: 'Quản trị', icon: ShieldCheck }] : NAV;
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-5">
        <Logo to="/drive" />
      </div>
      <nav className="flex-1 px-3 pt-2" aria-label="Điều hướng chính">
        <ul className="flex flex-col gap-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cx(
                    'flex h-9 items-center gap-3 rounded-ctl px-3 text-[13.5px] transition-colors',
                    isActive ? 'bg-surface font-medium text-ink shadow-[inset_0_0_0_1px_var(--border)]' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} weight={isActive ? 'fill' : 'bold'} className={isActive ? 'text-accent' : ''} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {user ? (
        <div className="m-3 rounded-box border border-line bg-surface p-3.5">
          <div className="flex items-baseline justify-between text-[12.5px]">
            <span className="font-medium text-ink">Dung lượng</span>
            <span className="tabular font-mono text-[11.5px] text-ink-2">
              {user.storageUsed > 0 && user.storageUsed / user.storageQuota < 0.01
                ? '<1%'
                : `${Math.round((user.storageUsed / user.storageQuota) * 100)}%`}
            </span>
          </div>
          <Meter value={user.storageUsed} max={user.storageQuota} className="mt-2.5" />
          <p className="tabular mt-2 text-[12px] text-ink-2">
            {formatBytes(user.storageUsed)} / {formatBytes(user.storageQuota)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ThemeMenu() {
  const { pref, set } = useTheme();
  const Icon = pref === 'dark' ? Moon : pref === 'light' ? Sun : Desktop;
  return (
    <Menu
      trigger={
        <IconButton label="Giao diện">
          <Icon size={18} weight="bold" />
        </IconButton>
      }
      items={[
        { label: 'Sáng', icon: <Sun size={15} weight="bold" />, onSelect: () => set('light') },
        { label: 'Tối', icon: <Moon size={15} weight="bold" />, onSelect: () => set('dark') },
        { label: 'Theo hệ thống', icon: <Desktop size={15} weight="bold" />, onSelect: () => set('system') },
      ]}
    />
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const [q, setQ] = useState(pathname === '/search' ? (params.get('q') ?? '') : '');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pathname !== '/search') setQ('');
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <form
      role="search"
      className="relative w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <MagnifyingGlass size={16} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm file"
        aria-label="Tìm kiếm file"
        className="h-9 w-full rounded-ctl border border-line bg-surface pl-9 pr-10 text-[13.5px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:block">
        <Kbd>/</Kbd>
      </span>
    </form>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <Menu
      trigger={
        <button
          className="flex h-9 items-center gap-2.5 rounded-ctl pl-1 pr-2 transition-colors hover:bg-surface-2"
          aria-label="Tài khoản"
        >
          <span className="flex size-7 items-center justify-center rounded-[6px] bg-primary text-[11px] font-semibold text-on-primary">
            {initials(user.name)}
          </span>
          <span className="hidden max-w-32 truncate text-[13px] font-medium text-ink md:block">{user.name}</span>
        </button>
      }
      items={[
        { label: 'Cài đặt tài khoản', icon: <GearSix size={15} weight="bold" />, onSelect: () => navigate('/settings') },
        {
          label: 'Đăng xuất',
          icon: <SignOut size={15} weight="bold" />,
          separatorBefore: true,
          onSelect: () => void logout().then(() => navigate('/login')),
        },
      ]}
    />
  );
}

function UploadButton({ folderId }: { folderId: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant="primary" icon={<UploadSimple size={16} weight="bold" />} onClick={() => input.current?.click()}>
        <span className="hidden sm:inline">Tải lên</span>
      </Button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        data-testid="upload-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) uploads.add(files, folderId);
          e.target.value = '';
        }}
      />
    </>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!pathname.startsWith('/drive')) setFolderId(null);
  }, [pathname]);

  return (
    <FolderCtx.Provider value={{ folderId, setFolderId }}>
      <div className="flex min-h-[100dvh]">
        <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 border-r border-line lg:block">
          <Sidebar />
        </aside>

        <RDialog.Root open={drawer} onOpenChange={setDrawer}>
          <RDialog.Portal>
            <RDialog.Overlay className="fade-in fixed inset-0 z-40 bg-overlay lg:hidden" />
            <RDialog.Content className="fixed inset-y-0 left-0 z-50 w-72 border-r border-line bg-bg lg:hidden" aria-describedby={undefined}>
              <RDialog.Title className="sr-only">Menu</RDialog.Title>
              <Sidebar onNavigate={() => setDrawer(false)} />
            </RDialog.Content>
          </RDialog.Portal>
        </RDialog.Root>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/90 px-4 backdrop-blur sm:gap-3 lg:px-6">
            <IconButton label="Mở menu" className="lg:hidden" onClick={() => setDrawer(true)}>
              <List size={20} weight="bold" />
            </IconButton>
            <SearchBox />
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <UploadButton folderId={folderId} />
              <ThemeMenu />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 px-4 pb-16 pt-6 lg:px-8">{children ?? <Outlet />}</main>
        </div>
      </div>
      <UploadPanel />
    </FolderCtx.Provider>
  );
}

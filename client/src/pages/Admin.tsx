import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CaretLeft, CaretRight, DotsThree, HardDrives, LockSimple, LockSimpleOpen, MagnifyingGlass, ShieldCheck, Trash, User as UserIcon } from '@phosphor-icons/react';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAdminMutations, useAdminOverview, useAdminUsers } from '@/lib/queries';
import { formatBytes, formatNumber, formatRelative } from '@/lib/format';
import type { AdminUser } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { ActivityChart, StatRow } from '@/components/charts';
import { useConfirm } from '@/components/confirm';
import { Button, Dialog, Field, IconButton, Input, Menu, Meter, Pill, Skeleton, cx, useFieldId } from '@/components/ui';

function QuotaDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const { update } = useAdminMutations();
  const [gb, setGb] = useState('');
  const [error, setError] = useState<string>();
  const id = useFieldId('quota');

  useEffect(() => {
    if (user) setGb(String(Math.round((user.storageQuota / 1024 ** 3) * 100) / 100));
    setError(undefined);
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = Number(gb.replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) return setError('Nhập số GB lớn hơn 0');
    try {
      await update.mutateAsync({ id: user!.id, storageQuotaMb: Math.max(1, Math.round(v * 1024)) });
      toast.success('Đã cập nhật hạn mức');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()} size="sm" title="Hạn mức dung lượng" description={user?.email}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Hạn mức (GB)" htmlFor={id} error={error} hint={user ? `Đang dùng ${formatBytes(user.storageUsed)}` : undefined}>
          <Input id={id} inputMode="decimal" value={gb} onChange={(e) => setGb(e.target.value)} invalid={!!error} autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" loading={update.isPending}>
            Lưu
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function Admin() {
  const { user: me } = useAuth();
  const overview = useAdminOverview();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const users = useAdminUsers(query, page);
  const { update, remove } = useAdminMutations();
  const confirm = useConfirm();
  const [quotaFor, setQuotaFor] = useState<AdminUser | null>(null);

  useEffect(() => {
    document.title = 'Quản trị - FileShare';
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const menuFor = (u: AdminUser) => {
    const self = u.id === me?.id;
    return [
      { label: 'Đổi hạn mức', icon: <HardDrives size={15} weight="bold" />, onSelect: () => setQuotaFor(u) },
      u.role === 'admin'
        ? { label: 'Bỏ quyền quản trị', icon: <UserIcon size={15} weight="bold" />, disabled: self, onSelect: () => void act(() => update.mutateAsync({ id: u.id, role: 'user' }), 'Đã bỏ quyền quản trị') }
        : { label: 'Cấp quyền quản trị', icon: <ShieldCheck size={15} weight="bold" />, onSelect: () => void act(() => update.mutateAsync({ id: u.id, role: 'admin' }), 'Đã cấp quyền quản trị') },
      u.disabled
        ? { label: 'Mở khoá tài khoản', icon: <LockSimpleOpen size={15} weight="bold" />, onSelect: () => void act(() => update.mutateAsync({ id: u.id, disabled: false }), 'Đã mở khoá') }
        : {
            label: 'Khoá tài khoản',
            icon: <LockSimple size={15} weight="bold" />,
            disabled: self,
            onSelect: async () => {
              if (await confirm({ title: `Khoá tài khoản ${u.name}?`, body: 'Người dùng sẽ bị đăng xuất khỏi mọi thiết bị và không đăng nhập được nữa.', confirmLabel: 'Khoá', danger: true }))
                await act(() => update.mutateAsync({ id: u.id, disabled: true }), 'Đã khoá tài khoản');
            },
          },
      {
        label: 'Xoá tài khoản',
        icon: <Trash size={15} weight="bold" />,
        danger: true,
        disabled: self,
        separatorBefore: true,
        onSelect: async () => {
          if (
            await confirm({
              title: `Xoá tài khoản ${u.name}?`,
              body: `Toàn bộ ${u.fileCount} file (${formatBytes(u.storageUsed)}) và link chia sẻ của người dùng này sẽ bị xoá vĩnh viễn.`,
              confirmLabel: 'Xoá vĩnh viễn',
              danger: true,
            })
          )
            await act(() => remove.mutateAsync(u.id), 'Đã xoá tài khoản');
        },
      },
    ];
  };

  const o = overview.data;
  return (
    <div>
      <PageHeader title="Quản trị hệ thống" description="Theo dõi mức sử dụng và quản lý tài khoản người dùng." />

      {!o ? (
        <Skeleton className="h-28" />
      ) : (
        <StatRow
          items={[
            { label: 'Người dùng', value: formatNumber(o.counts.users), sub: `${formatNumber(o.counts.activeUsers)} hoạt động trong 30 ngày` },
            { label: 'File', value: formatNumber(o.counts.files) },
            { label: 'Dung lượng đã dùng', value: formatBytes(o.storage.used) },
            { label: 'Dung lượng đã cấp', value: formatBytes(o.storage.allocated) },
          ]}
        />
      )}

      {o ? (
        <section className="mt-5 rounded-box border border-line bg-surface p-5">
          <ActivityChart data={o.daily} title="Hoạt động toàn hệ thống" />
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Người dùng</h2>
          <div className="relative w-full sm:w-72">
            <MagnifyingGlass size={15} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên hoặc email" aria-label="Tìm người dùng" className="h-9 pl-9" />
          </div>
        </div>

        <div className={cx('overflow-hidden rounded-box border border-line bg-surface transition-opacity', users.isPlaceholderData && 'opacity-60')}>
          <div className="hidden grid-cols-[1fr_200px_90px_120px_40px] gap-4 border-b border-line px-4 py-2 text-[12px] font-medium text-ink-2 md:grid">
            <span>Tài khoản</span>
            <span>Dung lượng</span>
            <span className="text-right">File</span>
            <span>Đăng nhập</span>
            <span />
          </div>
          {users.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {users.data?.items.map((u) => (
                <li key={u.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[1fr_200px_90px_120px_40px]" data-testid="admin-user-row">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-[13.5px] font-medium text-ink">
                      <span className="truncate">{u.name}</span>
                      {u.role === 'admin' ? <Pill tone="accent">Quản trị</Pill> : null}
                      {u.disabled ? <Pill tone="red">Đã khoá</Pill> : null}
                    </p>
                    <p className="truncate text-[12px] text-ink-2">{u.email}</p>
                  </div>
                  <div className="order-last col-span-2 md:order-none md:col-span-1">
                    <Meter value={u.storageUsed} max={u.storageQuota} />
                    <p className="tabular mt-1 text-[11.5px] text-ink-2">
                      {formatBytes(u.storageUsed)} / {formatBytes(u.storageQuota)}
                    </p>
                  </div>
                  <span className="tabular hidden text-right font-mono text-[12.5px] text-ink md:block">{formatNumber(u.fileCount)}</span>
                  <span className="hidden text-[12.5px] text-ink-2 md:block">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Chưa đăng nhập'}</span>
                  <Menu
                    items={menuFor(u)}
                    trigger={
                      <IconButton label={`Thao tác với ${u.name}`} size="sm">
                        <DotsThree size={18} weight="bold" />
                      </IconButton>
                    }
                  />
                </li>
              ))}
              {users.data?.items.length === 0 ? <li className="px-4 py-8 text-center text-[13px] text-ink-2">Không tìm thấy người dùng phù hợp</li> : null}
            </ul>
          )}
        </div>
        {users.data && users.data.pages > 1 ? (
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="tabular mr-auto text-[13px] text-ink-2">
              Trang {users.data.page} / {users.data.pages}
            </span>
            <Button size="sm" icon={<CaretLeft size={14} weight="bold" />} disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Trước
            </Button>
            <Button size="sm" disabled={page >= users.data.pages} onClick={() => setPage(page + 1)}>
              Sau <CaretRight size={14} weight="bold" />
            </Button>
          </div>
        ) : null}
      </section>
      <QuotaDialog user={quotaFor} onClose={() => setQuotaFor(null)} />
    </div>
  );
}

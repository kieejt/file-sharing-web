import { useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowCounterClockwise, Trash as TrashIcon } from '@phosphor-icons/react';
import { errorMessage } from '@/lib/api';
import { useTrash, useTrashMutations } from '@/lib/queries';
import { formatBytes, formatRelative } from '@/lib/format';
import type { TrashItem } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { useConfirm } from '@/components/confirm';
import { Button, EmptyState, FileBadge, StackArt } from '@/components/ui';
import { FolderBadge, ListSkeleton } from '@/components/files/FileViews';

const DAY = 86_400_000;

export default function Trash() {
  const trash = useTrash();
  const { restore, purge, empty } = useTrashMutations();
  const confirm = useConfirm();

  useEffect(() => {
    document.title = 'Thùng rác - FileShare';
  }, []);

  const items = trash.data?.items ?? [];
  const retention = trash.data?.retentionDays ?? 30;
  const daysLeft = (it: TrashItem) => Math.max(0, Math.ceil((new Date(it.trashedAt).getTime() + retention * DAY - Date.now()) / DAY));

  const doRestore = async (it: TrashItem) => {
    try {
      await restore.mutateAsync(it.batch);
      toast.success(`Đã khôi phục "${it.name}"`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const doPurge = async (it: TrashItem) => {
    const ok = await confirm({
      title: 'Xoá vĩnh viễn?',
      body: `"${it.name}"${it.type === 'folder' ? ' và toàn bộ nội dung bên trong' : ''} sẽ bị xoá vĩnh viễn và không thể khôi phục.`,
      confirmLabel: 'Xoá vĩnh viễn',
      danger: true,
    });
    if (!ok) return;
    try {
      await purge.mutateAsync(it.batch);
      toast.success('Đã xoá vĩnh viễn');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const doEmpty = async () => {
    const ok = await confirm({
      title: 'Dọn sạch thùng rác?',
      body: `${items.length} mục sẽ bị xoá vĩnh viễn và không thể khôi phục.`,
      confirmLabel: 'Dọn sạch',
      danger: true,
    });
    if (!ok) return;
    try {
      const r = await empty.mutateAsync();
      toast.success(`Đã giải phóng ${formatBytes(r.freed)}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Thùng rác"
        description={`Mục trong thùng rác vẫn tính vào dung lượng và tự xoá vĩnh viễn sau ${retention} ngày.`}
        actions={
          items.length ? (
            <Button variant="secondary" className="text-danger" icon={<TrashIcon size={16} weight="bold" />} onClick={doEmpty} loading={empty.isPending}>
              Dọn sạch thùng rác
            </Button>
          ) : undefined
        }
      />

      {trash.isLoading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState art={<StackArt />} title="Thùng rác trống" body="File và thư mục bạn xoá sẽ nằm ở đây để có thể khôi phục khi cần." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-box border border-line bg-surface">
          {items.map((it) => (
            <li key={it.batch} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center" data-testid="trash-row">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {it.type === 'folder' ? <FolderBadge /> : <FileBadge name={it.name} kind={it.kind} />}
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">{it.name}</p>
                  <p className="tabular text-[12px] text-ink-2">
                    {it.type === 'folder' ? (it.itemCount ? `Thư mục ${it.itemCount} file, ${formatBytes(it.size)}` : 'Thư mục trống') : formatBytes(it.size)}, xoá {formatRelative(it.trashedAt).toLowerCase()} · tự xoá sau {daysLeft(it)} ngày
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" icon={<ArrowCounterClockwise size={14} weight="bold" />} onClick={() => void doRestore(it)}>
                  Khôi phục
                </Button>
                <Button size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => void doPurge(it)}>
                  Xoá vĩnh viễn
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

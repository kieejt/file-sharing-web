import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, LockSimple, Prohibit } from '@phosphor-icons/react';
import { errorMessage } from '@/lib/api';
import { useMyShares, useShareMutations } from '@/lib/queries';
import { formatRelative } from '@/lib/format';
import type { Share } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { useConfirm } from '@/components/confirm';
import { EmptyState, FileBadge, IconButton, Pill, StackArt, cx } from '@/components/ui';
import { ListSkeleton } from '@/components/files/FileViews';
import { STATUS_META, copyText, shareSummary, shareUrl } from '@/components/files/ShareDialog';

type Filter = 'all' | 'active' | 'inactive';

export default function Shared() {
  const shares = useMyShares();
  const { revoke } = useShareMutations();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    document.title = 'Đã chia sẻ - FileShare';
  }, []);

  const all = shares.data ?? [];
  const list = all.filter((s) => (filter === 'all' ? true : filter === 'active' ? s.status === 'active' : s.status !== 'active'));
  const activeCount = all.filter((s) => s.status === 'active').length;

  const doRevoke = async (s: Share) => {
    const ok = await confirm({
      title: 'Thu hồi link chia sẻ?',
      body: `Link tới "${s.file?.name}" sẽ ngừng hoạt động ngay lập tức.`,
      confirmLabel: 'Thu hồi',
      danger: true,
    });
    if (!ok) return;
    try {
      await revoke.mutateAsync(s.id);
      toast.success('Đã thu hồi link');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const tabs: [Filter, string][] = [
    ['all', `Tất cả (${all.length})`],
    ['active', `Đang hoạt động (${activeCount})`],
    ['inactive', `Hết hiệu lực (${all.length - activeCount})`],
  ];

  return (
    <div>
      <PageHeader title="Đã chia sẻ" description="Mọi link chia sẻ bạn đã tạo. Thu hồi link bất cứ lúc nào để chặn truy cập." />

      <div className="mb-4 flex gap-1 border-b border-line" role="tablist">
        {tabs.map(([v, label]) => (
          <button
            key={v}
            role="tab"
            aria-selected={filter === v}
            onClick={() => setFilter(v)}
            className={cx(
              '-mb-px border-b-2 px-3 pb-2.5 text-[13px] font-medium transition-colors',
              filter === v ? 'border-ink text-ink' : 'border-transparent text-ink-2 hover:text-ink',
            )}
          >
            <span className="tabular">{label}</span>
          </button>
        ))}
      </div>

      {shares.isLoading ? (
        <ListSkeleton rows={4} />
      ) : list.length === 0 ? (
        <EmptyState
          art={<StackArt />}
          title={all.length ? 'Không có link nào trong mục này' : 'Bạn chưa chia sẻ file nào'}
          body={all.length ? undefined : 'Mở menu của một file và chọn "Chia sẻ" để tạo link có mật khẩu, hạn dùng hoặc giới hạn lượt tải.'}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-box border border-line bg-surface">
          {list.map((s) => {
            const meta = STATUS_META[s.status];
            return (
              <li key={s.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center" data-testid="share-row">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {s.file ? <FileBadge name={s.file.name} kind={s.file.kind} /> : null}
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">{s.file?.name}</p>
                    <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-ink-2">
                      <code className="truncate font-mono">{shareUrl(s).replace(/^https?:\/\//, '')}</code>
                      {s.hasPassword ? <LockSimple size={12} weight="bold" aria-label="Có mật khẩu" className="shrink-0" /> : null}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:w-[380px] sm:justify-end">
                  <div className="min-w-0 flex-1 sm:text-right">
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                    <p className="tabular mt-1 truncate text-[12px] text-ink-2">
                      {shareSummary(s)} · tạo {formatRelative(s.createdAt).toLowerCase()}
                    </p>
                  </div>
                  <IconButton label="Sao chép link" onClick={() => void copyText(shareUrl(s))}>
                    <Copy size={16} weight="bold" />
                  </IconButton>
                  <IconButton label="Thu hồi link" className="hover:text-danger" onClick={() => void doRevoke(s)}>
                    <Prohibit size={16} weight="bold" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

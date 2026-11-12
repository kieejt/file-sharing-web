import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useFileSearch } from '@/lib/queries';
import { KIND_FILTERS, KIND_META } from '@/lib/kinds';
import { formatRelative } from '@/lib/format';
import type { FileKind } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Button, EmptyState, StackArt, cx } from '@/components/ui';
import { FileList, ListSkeleton, keyOf } from '@/components/files/FileViews';
import { useFileActions } from '@/components/files/useFileActions';
import { SelectionBar } from '@/components/files/Toolbar';

export default function FileSearch({ mode }: { mode: 'recent' | 'search' }) {
  const [params, setParams] = useSearchParams();
  const q = mode === 'search' ? (params.get('q') ?? '') : '';
  const kind = (params.get('kind') ?? '') as FileKind | '';
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const actions = useFileActions();

  const result = useFileSearch({ q, kind, page, sort: 'createdAt', order: 'desc' });
  const items = result.data?.items ?? [];

  useEffect(() => {
    document.title = `${mode === 'search' ? 'Tìm kiếm' : 'Gần đây'} - FileShare`;
    setSelected(new Set());
  }, [mode, q, kind, page]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next);
  };

  const toggle = useCallback((key: string, v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const fileIds = useMemo(() => [...selected].map((k) => k.slice(2)), [selected]);

  const title = mode === 'search' ? (q ? `Kết quả cho "${q}"` : 'Tìm kiếm') : 'Gần đây';
  const total = result.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title={title}
        description={
          result.data ? (
            <span className="tabular">{mode === 'recent' ? `${total} file, mới nhất trước` : `Tìm thấy ${total} file`}</span>
          ) : undefined
        }
      />

      <div className="scrollbar-thin -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0" role="tablist" aria-label="Lọc theo loại">
        {KIND_FILTERS.map((k) => (
          <button
            key={k.value}
            role="tab"
            aria-selected={kind === k.value}
            onClick={() => setParam('kind', k.value)}
            className={cx(
              'h-8 shrink-0 rounded-full border px-3.5 text-[12.5px] font-medium transition-colors',
              kind === k.value ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <SelectionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onMove={() => actions.openMove({ fileIds, folderIds: [], onDone: () => setSelected(new Set()) })}
        onTrash={() => void actions.trashMany(fileIds, [], `${fileIds.length} file`, () => setSelected(new Set()))}
      />

      {result.isLoading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          art={<StackArt />}
          title={q || kind ? 'Không có file phù hợp' : 'Chưa có file nào'}
          body={q || kind ? 'Thử từ khoá khác hoặc bỏ bộ lọc loại file.' : 'File bạn tải lên sẽ xuất hiện ở đây.'}
        />
      ) : (
        <div className={cx('transition-opacity', result.isPlaceholderData && 'opacity-60')}>
          <FileList
            folders={[]}
            files={items}
            selected={selected}
            onToggle={toggle}
            onToggleAll={(v) => setSelected(v ? new Set(items.map((f) => keyOf('file', f.id))) : new Set())}
            fileActions={actions.fileActions}
            locationOf={(f) => `${KIND_META[f.kind].label} · tải lên ${formatRelative(f.createdAt).toLowerCase()}`}
          />
        </div>
      )}

      {result.data && result.data.pages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <span className="tabular text-[13px] text-ink-2">
            Trang {result.data.page} / {result.data.pages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" icon={<CaretLeft size={14} weight="bold" />} disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
              Trước
            </Button>
            <Button size="sm" disabled={page >= result.data.pages} onClick={() => setParam('page', String(page + 1))}>
              Sau
              <CaretRight size={14} weight="bold" />
            </Button>
          </div>
        </div>
      ) : null}
      {actions.dialogs}
    </div>
  );
}

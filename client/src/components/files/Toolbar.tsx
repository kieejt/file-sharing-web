import { ArrowBendUpRight, Check, Rows, SortAscending, SortDescending, SquaresFour, Trash, X } from '@phosphor-icons/react';
import type { SortKey, SortOrder } from '@/lib/queries';
import { Button, IconButton, Menu, cx } from '../ui';
import type { ViewMode } from './FileViews';

const SORT_LABEL: Record<SortKey, string> = { name: 'Tên', createdAt: 'Ngày tải lên', size: 'Kích thước' };

export function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex rounded-ctl border border-line bg-surface p-0.5" role="group" aria-label="Kiểu hiển thị">
      {(
        [
          ['list', 'Danh sách', Rows],
          ['grid', 'Lưới', SquaresFour],
        ] as const
      ).map(([v, label, Icon]) => (
        <button
          key={v}
          aria-label={label}
          title={label}
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={cx('flex size-8 items-center justify-center rounded-[5px] transition-colors', view === v ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:text-ink')}
        >
          <Icon size={16} weight="bold" />
        </button>
      ))}
    </div>
  );
}

export function SortMenu({ sort, order, onChange }: { sort: SortKey; order: SortOrder; onChange: (s: SortKey, o: SortOrder) => void }) {
  const Icon = order === 'asc' ? SortAscending : SortDescending;
  const check = (on: boolean) => (on ? <Check size={14} weight="bold" /> : null);
  return (
    <Menu
      trigger={
        <Button variant="secondary" icon={<Icon size={16} weight="bold" />}>
          {SORT_LABEL[sort]}
        </Button>
      }
      items={[
        ...(Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({
          label: SORT_LABEL[k],
          icon: check(sort === k),
          onSelect: () => onChange(k, k === 'name' ? 'asc' : 'desc'),
        })),
        { label: 'Tăng dần', icon: check(order === 'asc'), onSelect: () => onChange(sort, 'asc'), separatorBefore: true },
        { label: 'Giảm dần', icon: check(order === 'desc'), onSelect: () => onChange(sort, 'desc') },
      ]}
    />
  );
}

export function SelectionBar({ count, onMove, onTrash, onClear }: { count: number; onMove?: () => void; onTrash: () => void; onClear: () => void }) {
  if (!count) return null;
  return (
    <div className="pop-in sticky top-16 z-10 mb-3 flex items-center gap-2 rounded-box border border-line bg-surface px-2 py-1.5 shadow-pop" role="toolbar" aria-label="Thao tác với mục đã chọn">
      <IconButton label="Bỏ chọn" size="sm" onClick={onClear}>
        <X size={15} weight="bold" />
      </IconButton>
      <span className="tabular mr-auto text-[13px] font-medium text-ink">Đã chọn {count} mục</span>
      {onMove ? (
        <Button size="sm" variant="ghost" icon={<ArrowBendUpRight size={15} weight="bold" />} onClick={onMove}>
          Di chuyển
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" className="text-danger hover:text-danger" icon={<Trash size={15} weight="bold" />} onClick={onTrash}>
        Xoá
      </Button>
    </div>
  );
}

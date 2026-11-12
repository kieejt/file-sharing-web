import { useState } from 'react';
import { ArrowClockwise, CaretDown, CaretUp, Check, X } from '@phosphor-icons/react';
import { uploads, useUploads, type UploadItem } from '@/lib/uploads';
import { formatBytes } from '@/lib/format';
import { detectKind } from '@/lib/kindOfFile';
import { FileBadge, IconButton, cx } from './ui';

function Row({ it }: { it: UploadItem }) {
  const pct = it.file.size ? Math.min(100, (it.loaded / it.file.size) * 100) : it.status === 'done' ? 100 : 0;
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <FileBadge name={it.file.name} kind={detectKind(it.file.name, it.file.type)} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-ink">{it.file.name}</p>
        {it.status === 'error' ? (
          <p className="truncate text-[12px] text-danger">{it.error}</p>
        ) : it.status === 'canceled' ? (
          <p className="text-[12px] text-ink-3">Đã huỷ</p>
        ) : (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className={cx('h-full rounded-full transition-[width] duration-200', it.status === 'done' ? 'bg-success' : 'bg-accent')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="tabular w-14 text-right font-mono text-[11px] text-ink-2">
              {it.status === 'queued' ? 'Chờ' : it.status === 'done' ? formatBytes(it.file.size) : `${Math.round(pct)}%`}
            </span>
          </div>
        )}
      </div>
      {it.status === 'done' ? (
        <span className="flex size-7 items-center justify-center text-success" aria-label="Hoàn tất">
          <Check size={16} weight="bold" />
        </span>
      ) : it.status === 'error' || it.status === 'canceled' ? (
        <IconButton label="Thử lại" size="sm" onClick={() => uploads.retry(it.id)}>
          <ArrowClockwise size={15} weight="bold" />
        </IconButton>
      ) : (
        <IconButton label="Huỷ tải lên" size="sm" onClick={() => uploads.cancel(it.id)}>
          <X size={15} weight="bold" />
        </IconButton>
      )}
    </li>
  );
}

export function UploadPanel() {
  const items = useUploads();
  const [collapsed, setCollapsed] = useState(false);
  if (!items.length) return null;

  const active = items.filter((i) => i.status === 'uploading' || i.status === 'queued').length;
  const failed = items.filter((i) => i.status === 'error').length;
  const done = items.filter((i) => i.status === 'done').length;
  const title = active
    ? `Đang tải lên ${active} file`
    : failed
      ? `${failed} file tải lên thất bại`
      : `Đã tải lên ${done} file`;

  return (
    <section
      aria-label="Tiến trình tải lên"
      className="pop-in fixed bottom-4 right-4 z-30 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-box border border-line bg-surface shadow-pop"
    >
      <header className="flex items-center gap-2 border-b border-line py-2 pl-4 pr-2">
        <h2 className="flex-1 text-[13px] font-semibold text-ink" aria-live="polite">
          {title}
        </h2>
        <IconButton label={collapsed ? 'Mở rộng' : 'Thu gọn'} size="sm" onClick={() => setCollapsed((v) => !v)}>
          {collapsed ? <CaretUp size={15} weight="bold" /> : <CaretDown size={15} weight="bold" />}
        </IconButton>
        {!active ? (
          <IconButton label="Đóng" size="sm" onClick={() => uploads.clearFinished()}>
            <X size={15} weight="bold" />
          </IconButton>
        ) : null}
      </header>
      {!collapsed ? (
        <ul className="scrollbar-thin max-h-72 divide-y divide-line overflow-y-auto">
          {items.map((it) => (
            <Row key={it.id} it={it} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

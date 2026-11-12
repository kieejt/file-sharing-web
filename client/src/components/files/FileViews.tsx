import { memo, type ReactNode } from 'react';
import {
  ArrowBendUpRight,
  DotsThree,
  DownloadSimple,
  Eye,
  FolderSimple,
  LinkSimple,
  PencilSimple,
  Trash,
} from '@phosphor-icons/react';
import type { FileItem, Folder } from '@/lib/types';
import { formatBytes, formatRelative } from '@/lib/format';
import { KIND_META } from '@/lib/kinds';
import { Checkbox, FileBadge, IconButton, Menu, Skeleton, cx, type MenuItem } from '../ui';

export type ViewMode = 'list' | 'grid';
export const keyOf = (type: 'file' | 'folder', id: string) => `${type === 'file' ? 'f' : 'd'}:${id}`;

export interface FileActionHandlers {
  open: (f: FileItem) => void;
  download: (f: FileItem) => void;
  share: (f: FileItem) => void;
  renameFile: (f: FileItem) => void;
  moveFile: (f: FileItem) => void;
  trashFile: (f: FileItem) => void;
}
export interface FolderActionHandlers {
  openFolder: (f: Folder) => void;
  renameFolder: (f: Folder) => void;
  moveFolder: (f: Folder) => void;
  trashFolder: (f: Folder) => void;
}

function fileMenu(f: FileItem, a: FileActionHandlers): MenuItem[] {
  return [
    { label: f.previewable ? 'Xem trước' : 'Xem chi tiết', icon: <Eye size={15} weight="bold" />, onSelect: () => a.open(f) },
    { label: 'Tải xuống', icon: <DownloadSimple size={15} weight="bold" />, onSelect: () => a.download(f) },
    { label: 'Chia sẻ', icon: <LinkSimple size={15} weight="bold" />, onSelect: () => a.share(f) },
    { label: 'Đổi tên', icon: <PencilSimple size={15} weight="bold" />, onSelect: () => a.renameFile(f), separatorBefore: true },
    { label: 'Di chuyển', icon: <ArrowBendUpRight size={15} weight="bold" />, onSelect: () => a.moveFile(f) },
    { label: 'Chuyển vào thùng rác', icon: <Trash size={15} weight="bold" />, onSelect: () => a.trashFile(f), danger: true, separatorBefore: true },
  ];
}

function folderMenu(f: Folder, a: FolderActionHandlers): MenuItem[] {
  return [
    { label: 'Mở', icon: <FolderSimple size={15} weight="bold" />, onSelect: () => a.openFolder(f) },
    { label: 'Đổi tên', icon: <PencilSimple size={15} weight="bold" />, onSelect: () => a.renameFolder(f), separatorBefore: true },
    { label: 'Di chuyển', icon: <ArrowBendUpRight size={15} weight="bold" />, onSelect: () => a.moveFolder(f) },
    { label: 'Chuyển vào thùng rác', icon: <Trash size={15} weight="bold" />, onSelect: () => a.trashFolder(f), danger: true, separatorBefore: true },
  ];
}

function MoreButton({ items, name }: { items: MenuItem[]; name: string }) {
  return (
    <Menu
      items={items}
      trigger={
        <IconButton label={`Thao tác cho ${name}`} size="sm" onClick={(e) => e.stopPropagation()}>
          <DotsThree size={18} weight="bold" />
        </IconButton>
      }
    />
  );
}

export function FolderBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'size-7', md: 'size-9', lg: 'size-14' }[size];
  const icon = { sm: 15, md: 18, lg: 26 }[size];
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-accent-text', dims)}>
      <FolderSimple size={icon} weight="fill" />
    </span>
  );
}

function Thumb({ file, size = 'md' }: { file: FileItem; size?: 'md' | 'lg' }) {
  if (file.thumbUrl && size === 'md') {
    return (
      <img
        src={file.thumbUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="size-9 shrink-0 rounded-[7px] border border-line object-cover"
      />
    );
  }
  return <FileBadge name={file.name} kind={file.kind} size={size === 'lg' ? 'lg' : 'md'} />;
}

/* ------------------------------------------------------------------ List */

interface ListProps {
  folders: Folder[];
  files: FileItem[];
  selected: Set<string>;
  onToggle: (key: string, value: boolean) => void;
  onToggleAll?: (value: boolean) => void;
  fileActions: FileActionHandlers;
  folderActions?: FolderActionHandlers;
  locationOf?: (f: FileItem) => ReactNode;
}

const ListRowFile = memo(function ListRowFile({
  f,
  checked,
  onToggle,
  actions,
  location,
}: {
  f: FileItem;
  checked: boolean;
  onToggle: ListProps['onToggle'];
  actions: FileActionHandlers;
  location?: ReactNode;
}) {
  const key = keyOf('file', f.id);
  return (
    <li
      className={cx(
        'group grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition-colors sm:grid-cols-[auto_1fr_96px_128px_auto] sm:px-4',
        checked ? 'bg-accent-soft/60' : 'hover:bg-surface-2',
      )}
      onClick={() => actions.open(f)}
      data-testid="file-row"
    >
      <Checkbox checked={checked} onChange={(v) => onToggle(key, v)} label={`Chọn ${f.name}`} />
      <div className="flex min-w-0 items-center gap-3">
        <Thumb file={f} />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-ink" title={f.name}>
            {f.name}
          </p>
          <p className="truncate text-[12px] text-ink-2">
            {location ?? KIND_META[f.kind].label}
            <span className="sm:hidden"> · {formatBytes(f.size)}</span>
          </p>
        </div>
      </div>
      <span className="tabular hidden text-right font-mono text-[12px] text-ink-2 sm:block">{formatBytes(f.size)}</span>
      <span className="hidden text-right text-[12.5px] text-ink-2 sm:block">{formatRelative(f.updatedAt)}</span>
      <div className="flex justify-end">
        <MoreButton items={fileMenu(f, actions)} name={f.name} />
      </div>
    </li>
  );
});

export function FileList({ folders, files, selected, onToggle, onToggleAll, fileActions, folderActions, locationOf }: ListProps) {
  const total = folders.length + files.length;
  const allChecked = total > 0 && selected.size === total;
  return (
    <div className="overflow-hidden rounded-box border border-line bg-surface">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line px-3 py-2 text-[12px] font-medium text-ink-2 sm:grid-cols-[auto_1fr_96px_128px_auto] sm:px-4">
        {onToggleAll ? (
          <Checkbox checked={allChecked} onChange={onToggleAll} label="Chọn tất cả" />
        ) : (
          <span className="w-4" />
        )}
        <span className="pl-12">Tên</span>
        <span className="hidden text-right sm:block">Kích thước</span>
        <span className="hidden text-right sm:block">Cập nhật</span>
        <span className="w-7" />
      </div>
      <ul className="divide-y divide-line">
        {folders.map((d, i) => {
          const key = keyOf('folder', d.id);
          const checked = selected.has(key);
          return (
            <li
              key={d.id}
              style={{ ['--i' as string]: Math.min(i, 12) }}
              className={cx(
                'enter group grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition-colors sm:grid-cols-[auto_1fr_96px_128px_auto] sm:px-4',
                checked ? 'bg-accent-soft/60' : 'hover:bg-surface-2',
              )}
              onClick={() => folderActions?.openFolder(d)}
              data-testid="folder-row"
            >
              <Checkbox checked={checked} onChange={(v) => onToggle(key, v)} label={`Chọn thư mục ${d.name}`} />
              <div className="flex min-w-0 items-center gap-3">
                <FolderBadge />
                <p className="truncate text-[13.5px] font-medium text-ink">{d.name}</p>
              </div>
              <span className="hidden text-right font-mono text-[12px] text-ink-3 sm:block">-</span>
              <span className="hidden text-right text-[12.5px] text-ink-2 sm:block">{formatRelative(d.updatedAt)}</span>
              <div className="flex justify-end">{folderActions ? <MoreButton items={folderMenu(d, folderActions)} name={d.name} /> : null}</div>
            </li>
          );
        })}
        {files.map((f) => (
          <ListRowFile
            key={f.id}
            f={f}
            checked={selected.has(keyOf('file', f.id))}
            onToggle={onToggle}
            actions={fileActions}
            location={locationOf?.(f)}
          />
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ Grid */

export function FileGrid({ folders, files, selected, onToggle, fileActions, folderActions }: ListProps) {
  return (
    <div className="space-y-6">
      {folders.length ? (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((d) => {
            const key = keyOf('folder', d.id);
            const checked = selected.has(key);
            return (
              <li
                key={d.id}
                onClick={() => folderActions?.openFolder(d)}
                data-testid="folder-tile"
                className={cx(
                  'group flex cursor-pointer items-center gap-3 rounded-box border bg-surface px-3 py-2.5 transition-colors',
                  checked ? 'border-accent bg-accent-soft/50' : 'border-line hover:border-line-strong',
                )}
              >
                <FolderBadge />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{d.name}</span>
                <Checkbox checked={checked} onChange={(v) => onToggle(key, v)} label={`Chọn thư mục ${d.name}`} className={cx(!checked && 'opacity-0 group-hover:opacity-100 focus:opacity-100')} />
                {folderActions ? <MoreButton items={folderMenu(d, folderActions)} name={d.name} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {files.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {files.map((f, i) => {
            const key = keyOf('file', f.id);
            const checked = selected.has(key);
            return (
              <li
                key={f.id}
                style={{ ['--i' as string]: Math.min(i, 15) }}
                onClick={() => fileActions.open(f)}
                data-testid="file-tile"
                className={cx(
                  'enter group relative cursor-pointer overflow-hidden rounded-box border bg-surface transition-colors',
                  checked ? 'border-accent' : 'border-line hover:border-line-strong',
                )}
              >
                <div className="flex aspect-[4/3] items-center justify-center border-b border-line bg-surface-2">
                  {f.thumbUrl ? (
                    <img src={f.thumbUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                  ) : (
                    <FileBadge name={f.name} kind={f.kind} size="lg" />
                  )}
                </div>
                <div className="flex items-start gap-1 p-2.5 pr-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink" title={f.name}>
                      {f.name}
                    </p>
                    <p className="tabular text-[11.5px] text-ink-2">
                      {formatBytes(f.size)} · {formatRelative(f.updatedAt)}
                    </p>
                  </div>
                  <MoreButton items={fileMenu(f, fileActions)} name={f.name} />
                </div>
                <div className={cx('absolute left-2 top-2 rounded-[5px] bg-surface/90 p-1', !checked && 'opacity-0 group-hover:opacity-100 focus-within:opacity-100')}>
                  <Checkbox checked={checked} onChange={(v) => onToggle(key, v)} label={`Chọn ${f.name}`} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-box border border-line bg-surface" aria-busy="true" aria-label="Đang tải">
      <div className="h-9 border-b border-line" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
          <Skeleton className="size-4" />
          <Skeleton className="size-9 rounded-[7px]" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className={cx('h-3.5', ['w-56', 'w-40', 'w-64', 'w-48', 'w-36', 'w-52'][i % 6])} />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="hidden h-3 w-14 sm:block" />
          <Skeleton className="hidden h-3 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

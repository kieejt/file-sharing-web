import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CaretRight, DownloadSimple, FolderSimple, House, LinkSimple } from '@phosphor-icons/react';
import { errorMessage, fieldErrors } from '@/lib/api';
import { useDriveMutations, useFileDetail, useFolderTree } from '@/lib/queries';
import { formatBytes, formatDateTime, formatNumber, splitName } from '@/lib/format';
import { KIND_META } from '@/lib/kinds';
import type { FileItem } from '@/lib/types';
import { Button, Dialog, Field, Input, Skeleton, Textarea, cx, useFieldId } from '../ui';
import { FilePreview } from './FilePreview';

/* ------------------------------------------------------------ Tên (đổi / tạo) */

export function NameDialog({
  open,
  title,
  initial,
  selectBase,
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: string;
  selectBase?: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<unknown>;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const id = useFieldId('name');

  useEffect(() => {
    if (!open) return;
    setValue(initial);
    setError(undefined);
    // Chọn sẵn phần tên (không gồm đuôi file) để gõ đè ngay
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const end = selectBase ? splitName(initial).base.length : initial.length;
      el.setSelectionRange(0, end);
    });
  }, [open, initial, selectBase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return setError('Tên không được để trống');
    setBusy(true);
    try {
      await onSubmit(value.trim());
      onClose();
    } catch (err) {
      setError(fieldErrors(err).name ?? errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()} title={title} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tên" htmlFor={id} error={error}>
          <Input id={id} ref={ref} value={value} onChange={(e) => setValue(e.target.value)} maxLength={255} invalid={!!error} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Di chuyển */

interface TreeNode {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
}

export function MoveDialog({
  open,
  onClose,
  count,
  excludeFolderIds,
  currentFolderId,
  onMove,
}: {
  open: boolean;
  onClose: () => void;
  count: number;
  excludeFolderIds: string[];
  currentFolderId: string | null;
  onMove: (targetId: string) => Promise<unknown>;
}) {
  const tree = useFolderTree(open);
  const [target, setTarget] = useState<string>('root');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTarget(currentFolderId ?? 'root');
  }, [open, currentFolderId]);

  // Dựng cây theo thứ tự duyệt sâu, loại bỏ thư mục đang di chuyển và toàn bộ con của nó
  const nodes = useMemo(() => {
    const all = tree.data ?? [];
    const children = new Map<string | null, typeof all>();
    for (const f of all) children.set(f.parentId, [...(children.get(f.parentId) ?? []), f]);
    const excluded = new Set(excludeFolderIds);
    const out: TreeNode[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const f of children.get(parent) ?? []) {
        if (excluded.has(f.id)) continue;
        out.push({ ...f, depth });
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [tree.data, excludeFolderIds]);

  const submit = async () => {
    setBusy(true);
    try {
      await onMove(target);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const Option = ({ id, name, depth, icon }: { id: string; name: string; depth: number; icon: React.ReactNode }) => (
    <li>
      <button
        type="button"
        onClick={() => setTarget(id)}
        aria-pressed={target === id}
        style={{ paddingLeft: 12 + depth * 18 }}
        className={cx(
          'flex h-9 w-full items-center gap-2.5 rounded-ctl pr-3 text-left text-[13.5px] transition-colors',
          target === id ? 'bg-accent-soft font-medium text-accent-text' : 'text-ink hover:bg-surface-2',
        )}
      >
        {icon}
        <span className="truncate">{name}</span>
        {id === (currentFolderId ?? 'root') ? <span className="ml-auto text-[11.5px] text-ink-3">Hiện tại</span> : null}
      </button>
    </li>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={`Di chuyển ${count} mục`}
      description="Chọn thư mục đích"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={submit} loading={busy} disabled={target === (currentFolderId ?? 'root')}>
            Chuyển đến đây
          </Button>
        </>
      }
    >
      {tree.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : (
        <ul className="space-y-0.5" data-testid="move-tree">
          <Option id="root" name="Tệp của tôi" depth={0} icon={<House size={16} weight="bold" />} />
          {nodes.map((n) => (
            <Option key={n.id} id={n.id} name={n.name} depth={n.depth + 1} icon={<FolderSimple size={16} weight="fill" className="text-accent" />} />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Xem trước */

export function PreviewDialog({
  fileId,
  onClose,
  onShare,
  onDownload,
}: {
  fileId: string | null;
  onClose: () => void;
  onShare: (f: FileItem) => void;
  onDownload: (f: FileItem) => void;
}) {
  const detail = useFileDetail(fileId);
  const { updateFile } = useDriveMutations();
  const [desc, setDesc] = useState('');
  const descId = useFieldId('desc');
  const f = detail.data?.file;

  useEffect(() => {
    setDesc(f?.description ?? '');
  }, [f?.id, f?.description]);

  const saveDesc = async () => {
    if (!f || desc === f.description) return;
    try {
      await updateFile.mutateAsync({ id: f.id, description: desc });
      toast.success('Đã lưu mô tả');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Dialog open={!!fileId} onOpenChange={(v) => !v && onClose()} size="xl" title={f?.name ?? 'Đang tải'} description={f ? `${KIND_META[f.kind].label} · ${formatBytes(f.size)}` : undefined}>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex h-[min(62vh,640px)] items-center justify-center overflow-hidden rounded-box border border-line bg-surface-2">
          {f && detail.data ? (
            <FilePreview url={detail.data.links.viewUrl} kind={f.kind} name={f.name} mimeType={f.mimeType} previewable={f.previewable} />
          ) : (
            <Skeleton className="size-full" />
          )}
        </div>
        <aside className="flex flex-col gap-5">
          <div className="flex gap-2">
            <Button variant="primary" className="flex-1" icon={<DownloadSimple size={16} weight="bold" />} disabled={!f} onClick={() => f && onDownload(f)}>
              Tải xuống
            </Button>
            <Button className="flex-1" icon={<LinkSimple size={16} weight="bold" />} disabled={!f} onClick={() => f && onShare(f)}>
              Chia sẻ
            </Button>
          </div>
          {f ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13px]">
              <dt className="text-ink-2">Vị trí</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-1 text-ink">
                <span>Tệp của tôi</span>
                {detail.data?.breadcrumbs.map((c) => (
                  <span key={c.id} className="flex min-w-0 items-center gap-1">
                    <CaretRight size={11} weight="bold" className="text-ink-3" />
                    <span className="truncate">{c.name}</span>
                  </span>
                ))}
              </dd>
              <dt className="text-ink-2">Kích thước</dt>
              <dd className="tabular text-ink">{formatBytes(f.size)}</dd>
              <dt className="text-ink-2">Lượt tải</dt>
              <dd className="tabular text-ink">{formatNumber(f.downloadCount)}</dd>
              <dt className="text-ink-2">Tải lên</dt>
              <dd className="text-ink">{formatDateTime(f.createdAt)}</dd>
              <dt className="text-ink-2">Định dạng</dt>
              <dd className="truncate font-mono text-[12px] text-ink">{f.mimeType}</dd>
            </dl>
          ) : (
            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4" />
              ))}
            </div>
          )}
          <Field label="Mô tả" htmlFor={descId} hint="Tự lưu khi bạn rời khỏi ô nhập">
            <Textarea id={descId} value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={saveDesc} maxLength={2000} placeholder="Thêm ghi chú cho file này" disabled={!f} />
          </Field>
        </aside>
      </div>
    </Dialog>
  );
}

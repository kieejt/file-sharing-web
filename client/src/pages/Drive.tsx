import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useDropzone } from 'react-dropzone';
import { CaretRight, FolderSimplePlus, UploadSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { errorStatus } from '@/lib/api';
import { useDrive, type SortKey, type SortOrder } from '@/lib/queries';
import { uploads } from '@/lib/uploads';
import { usePersisted } from '@/lib/usePersisted';
import { useCurrentFolder } from '@/layouts/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { Button, EmptyState, StackArt } from '@/components/ui';
import { FileGrid, FileList, ListSkeleton, keyOf, type ViewMode } from '@/components/files/FileViews';
import { NameDialog } from '@/components/files/dialogs';
import { useFileActions } from '@/components/files/useFileActions';
import { SelectionBar, SortMenu, ViewToggle } from '@/components/files/Toolbar';

export default function Drive() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { setFolderId } = useCurrentFolder();
  const [view, setView] = usePersisted<ViewMode>('fs-view', 'list');
  const [sortPref, setSortPref] = usePersisted<{ sort: SortKey; order: SortOrder }>('fs-sort', { sort: 'createdAt', order: 'desc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newFolder, setNewFolder] = useState(false);

  const drive = useDrive(folderId, sortPref.sort, sortPref.order);
  const actions = useFileActions(folderId ?? null);

  useEffect(() => {
    setFolderId(folderId ?? null);
    setSelected(new Set());
  }, [folderId, setFolderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(new Set());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onDrop = useCallback(
    (files: File[]) => {
      if (files.length) uploads.add(files, folderId ?? null);
    },
    [folderId],
  );
  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({ onDrop, noClick: true, noKeyboard: true });

  const data = drive.data;
  const folders = data?.folders ?? [];
  const files = data?.files ?? [];
  const title = data?.folder?.name ?? 'Tệp của tôi';

  useEffect(() => {
    document.title = `${title} - FileShare`;
  }, [title]);

  const toggle = useCallback((key: string, v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const toggleAll = (v: boolean) =>
    setSelected(v ? new Set([...folders.map((f) => keyOf('folder', f.id)), ...files.map((f) => keyOf('file', f.id))]) : new Set());

  const picked = useMemo(() => {
    const fileIds: string[] = [];
    const folderIds: string[] = [];
    selected.forEach((k) => (k.startsWith('f:') ? fileIds.push(k.slice(2)) : folderIds.push(k.slice(2))));
    return { fileIds, folderIds };
  }, [selected]);

  if (drive.isError && errorStatus(drive.error) === 404) {
    return (
      <EmptyState
        art={<StackArt />}
        title="Thư mục không tồn tại"
        body="Thư mục có thể đã bị xoá hoặc chuyển vào thùng rác."
        action={
          <Button variant="primary" onClick={() => navigate('/drive')}>
            Về Tệp của tôi
          </Button>
        }
      />
    );
  }

  const crumbs = data?.breadcrumbs ?? [];
  const isEmpty = !drive.isLoading && folders.length === 0 && files.length === 0;

  return (
    <div {...getRootProps({ className: 'relative min-h-[60vh] outline-none' })}>
      <input {...getInputProps()} data-testid="drop-input" />

      <PageHeader
        before={
          crumbs.length ? (
            <nav aria-label="Đường dẫn" className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1 text-[13px] text-ink-2">
              <Link to="/drive" className="rounded px-0.5 hover:text-ink">
                Tệp của tôi
              </Link>
              {crumbs.slice(0, -1).map((c) => (
                <span key={c.id} className="flex items-center gap-1">
                  <CaretRight size={11} weight="bold" className="text-ink-3" />
                  <Link to={`/drive/${c.id}`} className="max-w-40 truncate rounded px-0.5 hover:text-ink">
                    {c.name}
                  </Link>
                </span>
              ))}
            </nav>
          ) : null
        }
        title={title}
        description={
          data && !isEmpty ? (
            <span className="tabular">
              {folders.length ? `${folders.length} thư mục, ` : ''}
              {data.totalFiles} file
            </span>
          ) : undefined
        }
        actions={
          <>
            <Button icon={<FolderSimplePlus size={16} weight="bold" />} onClick={() => setNewFolder(true)}>
              Thư mục mới
            </Button>
            <SortMenu sort={sortPref.sort} order={sortPref.order} onChange={(sort, order) => setSortPref({ sort, order })} />
            <ViewToggle view={view} onChange={setView} />
          </>
        }
      />

      <SelectionBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        onMove={() => actions.openMove({ ...picked, onDone: () => setSelected(new Set()) })}
        onTrash={() => void actions.trashMany(picked.fileIds, picked.folderIds, `${selected.size} mục`, () => setSelected(new Set()))}
      />

      {drive.isLoading ? (
        <ListSkeleton />
      ) : isEmpty ? (
        <div className="rounded-box border border-dashed border-line-strong">
          <EmptyState
            art={<StackArt />}
            title={folderId ? 'Thư mục này đang trống' : 'Chưa có file nào'}
            body="Kéo thả file vào đây hoặc bấm nút bên dưới. Mỗi file tối đa 200 MB."
            action={
              <Button variant="primary" icon={<UploadSimple size={16} weight="bold" />} onClick={openPicker}>
                Chọn file để tải lên
              </Button>
            }
          />
        </div>
      ) : view === 'list' ? (
        <FileList
          folders={folders}
          files={files}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          fileActions={actions.fileActions}
          folderActions={actions.folderActions}
        />
      ) : (
        <FileGrid folders={folders} files={files} selected={selected} onToggle={toggle} fileActions={actions.fileActions} folderActions={actions.folderActions} />
      )}

      {isDragActive ? (
        <div className="fade-in pointer-events-none absolute -inset-3 z-20 flex items-center justify-center rounded-box border-2 border-dashed border-accent bg-accent-soft/80">
          <p className="rounded-ctl bg-surface px-4 py-2 text-[14px] font-medium text-accent-text shadow-pop">Thả để tải lên {title}</p>
        </div>
      ) : null}

      {drive.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button loading={drive.isFetchingNextPage} onClick={() => void drive.fetchNextPage()}>
            Tải thêm ({files.length}/{data?.totalFiles})
          </Button>
        </div>
      ) : null}

      {actions.dialogs}
      <NameDialog
        open={newFolder}
        title="Thư mục mới"
        initial="Thư mục mới"
        submitLabel="Tạo"
        onClose={() => setNewFolder(false)}
        onSubmit={async (name) => {
          await actions.createFolder(name);
          toast.success(`Đã tạo thư mục "${name}"`);
        }}
      />
    </div>
  );
}

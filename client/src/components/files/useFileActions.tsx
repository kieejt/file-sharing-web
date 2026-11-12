import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { getLinks, useDriveMutations } from '@/lib/queries';
import type { FileItem, Folder } from '@/lib/types';
import { useConfirm } from '../confirm';
import type { FileActionHandlers, FolderActionHandlers } from './FileViews';
import { MoveDialog, NameDialog, PreviewDialog } from './dialogs';
import { ShareDialog } from './ShareDialog';

/** Tải xuống qua signed URL: trình duyệt tự stream, không nạp cả file vào bộ nhớ. */
export async function downloadFile(f: Pick<FileItem, 'id' | 'name'>) {
  try {
    const { downloadUrl } = await getLinks(f.id);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = f.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (err) {
    toast.error(errorMessage(err, 'Không tải xuống được file'));
  }
}

type RenameTarget = { type: 'file'; item: FileItem } | { type: 'folder'; item: Folder };
type MoveTarget = { fileIds: string[]; folderIds: string[]; onDone?: () => void };

export function useFileActions(currentFolderId: string | null = null) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const m = useDriveMutations();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [rename, setRename] = useState<RenameTarget | null>(null);
  const [move, setMove] = useState<MoveTarget | null>(null);

  const trash = useCallback(
    async (fileIds: string[], folderIds: string[], label: string, onDone?: () => void) => {
      const ok = await confirm({
        title: `Chuyển ${label} vào thùng rác?`,
        body: folderIds.length
          ? 'Toàn bộ nội dung bên trong thư mục cũng sẽ được chuyển vào thùng rác. Bạn có thể khôi phục trong 30 ngày.'
          : 'Bạn có thể khôi phục trong thùng rác trong 30 ngày. Các link chia sẻ của file sẽ tạm ngừng hoạt động.',
        confirmLabel: 'Chuyển vào thùng rác',
        danger: true,
      });
      if (!ok) return;
      try {
        await m.trash.mutateAsync({ fileIds, folderIds });
        toast.success('Đã chuyển vào thùng rác');
        onDone?.();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    },
    [confirm, m.trash],
  );

  const fileActions = useMemo<FileActionHandlers>(
    () => ({
      open: (f) => setPreviewId(f.id),
      download: (f) => void downloadFile(f),
      share: (f) => setShareFile(f),
      renameFile: (f) => setRename({ type: 'file', item: f }),
      moveFile: (f) => setMove({ fileIds: [f.id], folderIds: [] }),
      trashFile: (f) => void trash([f.id], [], `"${f.name}"`),
    }),
    [trash],
  );

  const folderActions = useMemo<FolderActionHandlers>(
    () => ({
      openFolder: (f) => navigate(`/drive/${f.id}`),
      renameFolder: (f) => setRename({ type: 'folder', item: f }),
      moveFolder: (f) => setMove({ fileIds: [], folderIds: [f.id] }),
      trashFolder: (f) => void trash([], [f.id], `thư mục "${f.name}"`),
    }),
    [navigate, trash],
  );

  const dialogs = (
    <>
      <PreviewDialog
        fileId={previewId}
        onClose={() => setPreviewId(null)}
        onShare={(f) => {
          setPreviewId(null);
          setShareFile(f);
        }}
        onDownload={(f) => void downloadFile(f)}
      />
      <ShareDialog file={shareFile} onClose={() => setShareFile(null)} />
      <NameDialog
        open={!!rename}
        title={rename?.type === 'folder' ? 'Đổi tên thư mục' : 'Đổi tên file'}
        initial={rename?.item.name ?? ''}
        selectBase={rename?.type === 'file'}
        submitLabel="Lưu"
        onClose={() => setRename(null)}
        onSubmit={async (name) => {
          if (!rename) return;
          if (rename.type === 'file') await m.updateFile.mutateAsync({ id: rename.item.id, name });
          else await m.renameFolder.mutateAsync({ id: rename.item.id, name });
          toast.success('Đã đổi tên');
        }}
      />
      <MoveDialog
        open={!!move}
        onClose={() => setMove(null)}
        count={(move?.fileIds.length ?? 0) + (move?.folderIds.length ?? 0)}
        excludeFolderIds={move?.folderIds ?? []}
        currentFolderId={currentFolderId}
        onMove={async (targetId) => {
          if (!move) return;
          await m.move.mutateAsync({ ...move, targetId });
          toast.success('Đã di chuyển');
          move.onDone?.();
        }}
      />
    </>
  );

  return {
    fileActions,
    folderActions,
    dialogs,
    openMove: (t: MoveTarget) => setMove(t),
    trashMany: trash,
    createFolder: (name: string) => m.createFolder.mutateAsync({ name, parentId: currentFolderId }),
    api,
  };
}

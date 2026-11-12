import { useEffect, useState } from 'react';
import type { FileKind } from '@/lib/types';
import { FileBadge, Skeleton } from '../ui';

const TEXT_LIMIT = 256 * 1024;

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(url, { headers: { Range: `bytes=0-${TEXT_LIMIT - 1}` }, signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        // Content-Range: bytes 0-262143/<tổng kích thước>
        const total = Number(/\/(\d+)$/.exec(r.headers.get('content-range') ?? '')?.[1] ?? 0);
        setTruncated(r.status === 206 && total > TEXT_LIMIT);
        setText(await r.text());
      })
      .catch(() => !ctrl.signal.aborted && setFailed(true));
    return () => ctrl.abort();
  }, [url]);

  if (failed) return <p className="p-6 text-center text-[13px] text-ink-2">Không đọc được nội dung file.</p>;
  if (text === null)
    return (
      <div className="space-y-2 p-5">
        {['w-4/5', 'w-3/5', 'w-2/3', 'w-2/5', 'w-3/4'].map((w) => (
          <Skeleton key={w} className={`h-3 ${w}`} />
        ))}
      </div>
    );
  return (
    <div className="h-full overflow-auto">
      <pre className="whitespace-pre-wrap break-words p-5 font-mono text-[12.5px] leading-relaxed text-ink">{text}</pre>
      {truncated ? <p className="border-t border-line px-5 py-2 text-[12px] text-ink-2">Chỉ hiển thị 256 KB đầu tiên. Tải xuống để xem toàn bộ.</p> : null}
    </div>
  );
}

/** Hiển thị nội dung file theo loại. URL là signed URL ngắn hạn do server cấp. */
export function FilePreview({ url, kind, name, mimeType, previewable }: { url: string | null; kind: FileKind; name: string; mimeType: string; previewable: boolean }) {
  if (!previewable || !url) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <FileBadge name={name} kind={kind} size="lg" />
        <p className="max-w-xs text-[13px] text-ink-2">Loại file này không xem trước được trên trình duyệt. Bạn có thể tải xuống để mở bằng ứng dụng phù hợp.</p>
      </div>
    );
  }
  if (kind === 'image') return <img src={url} alt={name} className="mx-auto max-h-full max-w-full object-contain" />;
  if (kind === 'video')
    return (
      <video src={url} controls preload="metadata" className="max-h-full max-w-full bg-black">
        Trình duyệt không hỗ trợ phát video này.
      </video>
    );
  if (kind === 'audio')
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
        <FileBadge name={name} kind={kind} size="lg" />
        <audio src={url} controls preload="metadata" className="w-full max-w-md" />
      </div>
    );
  if (mimeType === 'application/pdf') return <iframe src={url} title={name} className="size-full border-0 bg-surface" />;
  return <TextPreview url={url} />;
}

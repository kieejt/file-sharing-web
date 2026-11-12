import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { DownloadSimple, LockSimple } from '@phosphor-icons/react';
import { api, errorMessage, errorStatus } from '@/lib/api';
import { formatBytes, formatDateTime, formatRemaining } from '@/lib/format';
import { KIND_META } from '@/lib/kinds';
import type { PublicShare as PublicShareData } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { Button, Field, FileBadge, Input, Skeleton, StackArt, useFieldId } from '@/components/ui';
import { FilePreview } from '@/components/files/FilePreview';

const accessKey = (token: string) => `fs-share-${token}`;

function readAccess(token: string) {
  try {
    return sessionStorage.getItem(accessKey(token));
  } catch {
    return null;
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <Logo />
        <Link to="/register" className="text-[13.5px] font-medium text-ink-2 hover:text-ink">
          Tạo tài khoản miễn phí
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">{children}</main>
    </div>
  );
}

function PasswordGate({ token, onUnlocked }: { token: string; onUnlocked: (a: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const id = useFieldId('sharepw');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const r = await api.post<{ accessToken: string }>(`/public/s/${token}/unlock`, { password });
      onUnlocked(r.data.accessToken);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enter w-full max-w-sm rounded-box border border-line bg-surface p-6">
      <span className="flex size-10 items-center justify-center rounded-[8px] bg-surface-2 text-ink">
        <LockSimple size={20} weight="bold" />
      </span>
      <h1 className="mt-4 text-[18px] font-semibold tracking-tight text-ink">File được bảo vệ</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">Nhập mật khẩu mà người gửi cung cấp để xem file.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Mật khẩu" htmlFor={id} error={error}>
          <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!error} autoFocus required />
        </Field>
        <Button type="submit" variant="primary" className="w-full" loading={busy}>
          Mở file
        </Button>
      </form>
    </div>
  );
}

export default function PublicShare() {
  const { token = '' } = useParams();
  const [access, setAccess] = useState<string | null>(() => readAccess(token));

  const meta = useQuery({
    queryKey: ['public-share', token, access],
    queryFn: async () =>
      (await api.get<PublicShareData>(`/public/s/${token}`, { headers: access ? { 'X-Share-Access': access } : {} })).data,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    document.title = meta.data?.file ? `${meta.data.file.name} - FileShare` : 'File được chia sẻ - FileShare';
  }, [meta.data]);

  const unlock = (a: string) => {
    try {
      sessionStorage.setItem(accessKey(token), a);
    } catch {
      /* không lưu được thì chỉ giữ trong bộ nhớ */
    }
    setAccess(a);
  };

  if (meta.isLoading) {
    return (
      <Shell>
        <div className="w-full max-w-3xl space-y-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-80" />
        </div>
      </Shell>
    );
  }

  if (meta.isError) {
    const s = errorStatus(meta.error);
    return (
      <Shell>
        <div className="enter flex max-w-sm flex-col items-center text-center">
          <StackArt />
          <h1 className="mt-5 text-[18px] font-semibold text-ink">{s === 410 ? 'Link đã hết hiệu lực' : 'Không tìm thấy file'}</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-2">
            {errorMessage(meta.error)}. Hãy liên hệ người gửi để nhận link mới.
          </p>
        </div>
      </Shell>
    );
  }

  const data = meta.data!;
  if (data.requiresPassword) {
    return (
      <Shell>
        <PasswordGate token={token} onUnlocked={unlock} />
      </Shell>
    );
  }

  const f = data.file!;
  const sh = data.share!;
  const q = access ? `a=${encodeURIComponent(access)}` : '';
  const base = `/api/public/s/${token}/content`;
  const viewUrl = q ? `${base}?${q}` : base;
  const downloadUrl = `${base}?dl=1${q ? `&${q}` : ''}`;
  const remaining = sh.remainingDownloads;

  return (
    <Shell>
      <div className="w-full max-w-4xl">
        <div className="enter flex flex-col gap-4 sm:flex-row sm:items-center">
          <FileBadge name={f.name} kind={f.kind} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-semibold tracking-tight text-ink" title={f.name}>
              {f.name}
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-2">
              {KIND_META[f.kind].label}, {formatBytes(f.size)}. Chia sẻ bởi <span className="font-medium text-ink">{sh.ownerName}</span>
            </p>
          </div>
          <a
            href={downloadUrl}
            onClick={() => remaining !== null && setTimeout(() => void meta.refetch(), 1500)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-ctl bg-primary px-5 text-[15px] font-medium text-on-primary transition-colors hover:bg-primary-hover active:translate-y-px"
            download
          >
            <DownloadSimple size={18} weight="bold" />
            Tải xuống
          </a>
        </div>

        <div className="enter mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-ink-2" style={{ ['--i' as string]: 1 }}>
          {sh.expiresAt ? (
            <span>
              Hết hạn {formatDateTime(sh.expiresAt)} ({formatRemaining(sh.expiresAt)})
            </span>
          ) : (
            <span>Link không giới hạn thời gian</span>
          )}
          {remaining !== null ? <span className="tabular">Còn {remaining} lượt tải</span> : null}
        </div>

        <div className="enter mt-5 flex h-[min(68vh,720px)] items-center justify-center overflow-hidden rounded-box border border-line bg-surface" style={{ ['--i' as string]: 2 }}>
          {f.previewable ? (
            <FilePreview url={viewUrl} kind={f.kind} name={f.name} mimeType={f.mimeType} previewable />
          ) : (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              {f.thumbUrl ? <img src={f.thumbUrl} alt="" className="max-h-64 rounded-ctl border border-line" /> : <FileBadge name={f.name} kind={f.kind} size="lg" />}
              <p className="max-w-sm text-[13px] text-ink-2">
                {remaining !== null ? 'Link này giới hạn lượt tải nên không hỗ trợ xem trước.' : 'Loại file này không xem trước được. Hãy tải xuống để mở.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

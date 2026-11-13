import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Globe, LockSimple, Prohibit } from '@phosphor-icons/react';
import { errorMessage, fieldErrors } from '@/lib/api';
import { useFileShares, useShareMutations } from '@/lib/queries';
import { formatDateTime, formatRemaining } from '@/lib/format';
import type { Share, ShareStatus } from '@/lib/types';
import { useConfirm } from '../confirm';
import { Button, Dialog, Field, IconButton, Input, Pill, Select, Skeleton, useFieldId } from '../ui';

export const shareUrl = (s: Pick<Share, 'path'>) => `${window.location.origin}${s.path}`;

export async function copyText(text: string, done = 'Đã sao chép link') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error('Trình duyệt không cho phép sao chép, hãy chép thủ công');
  }
}

export const STATUS_META: Record<ShareStatus, { label: string; tone: 'green' | 'stone' | 'yellow' | 'red' }> = {
  active: { label: 'Đang hoạt động', tone: 'green' },
  expired: { label: 'Đã hết hạn', tone: 'stone' },
  exhausted: { label: 'Hết lượt tải', tone: 'yellow' },
  revoked: { label: 'Đã thu hồi', tone: 'red' },
};

export function AccessPill({ access }: { access: Share['access'] }) {
  return access === 'private' ? (
    <Pill tone="stone">
      <LockSimple size={11} weight="bold" className="mr-1" />
      Riêng tư
    </Pill>
  ) : (
    <Pill tone="yellow">
      <Globe size={11} weight="bold" className="mr-1" />
      Công khai
    </Pill>
  );
}

const ACCESS_OPTIONS: { value: Share['access']; label: string; hint: string; icon: typeof Globe }[] = [
  { value: 'private', label: 'Riêng tư', hint: 'Người nhận phải nhập mật khẩu để mở', icon: LockSimple },
  { value: 'public', label: 'Công khai', hint: 'Bất kỳ ai có link đều mở được file', icon: Globe },
];

const EXPIRY = [
  { value: '', label: 'Không giới hạn' },
  { value: '1', label: '1 giờ' },
  { value: '24', label: '1 ngày' },
  { value: '168', label: '7 ngày' },
  { value: '720', label: '30 ngày' },
];

export function shareSummary(s: Share) {
  const parts = [`${s.viewCount} lượt xem`, s.maxDownloads != null ? `${s.downloadCount}/${s.maxDownloads} lượt tải` : `${s.downloadCount} lượt tải`];
  if (s.expiresAt) parts.push(s.status === 'expired' ? `hết hạn ${formatDateTime(s.expiresAt)}` : formatRemaining(s.expiresAt));
  return parts.join(', ');
}

function LinkRow({ s, onRevoke, highlight }: { s: Share; onRevoke: () => void; highlight: boolean }) {
  const [copied, setCopied] = useState(false);
  const meta = STATUS_META[s.status];
  return (
    <li className={`flex items-center gap-3 rounded-ctl border px-3 py-2.5 ${highlight ? 'border-accent bg-accent-soft/40' : 'border-line'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="truncate font-mono text-[12.5px] text-ink">{shareUrl(s).replace(/^https?:\/\//, '')}</code>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-2">
          <AccessPill access={s.access} />
          <Pill tone={meta.tone}>{meta.label}</Pill>
          <span className="tabular">{shareSummary(s)}</span>
        </div>
      </div>
      <IconButton
        label="Sao chép link"
        size="sm"
        onClick={async () => {
          await copyText(shareUrl(s));
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? <Check size={15} weight="bold" className="text-success" /> : <Copy size={15} weight="bold" />}
      </IconButton>
      <IconButton label="Thu hồi link" size="sm" onClick={onRevoke} className="hover:text-danger">
        <Prohibit size={15} weight="bold" />
      </IconButton>
    </li>
  );
}

export function ShareDialog({ file, onClose }: { file: { id: string; name: string } | null; onClose: () => void }) {
  const shares = useFileShares(file?.id ?? null);
  const { create, revoke } = useShareMutations();
  const confirm = useConfirm();
  const [access, setAccess] = useState<Share['access']>('private');
  const [expiry, setExpiry] = useState('');
  const [password, setPassword] = useState('');
  const [maxDl, setMaxDl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  const ids = { expiry: useFieldId('exp'), pw: useFieldId('pw'), max: useFieldId('max') };

  const reset = () => {
    setAccess('private');
    setExpiry('');
    setPassword('');
    setMaxDl('');
    setErrors({});
    setLastCreated(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const max = maxDl.trim() ? Number(maxDl) : null;
    if (max !== null && (!Number.isInteger(max) || max < 1)) {
      setErrors({ maxDownloads: 'Nhập số nguyên lớn hơn 0' });
      return;
    }
    if (access === 'private' && password.length < 4) {
      setErrors({ password: 'Link riêng tư cần mật khẩu, ít nhất 4 ký tự' });
      return;
    }
    setErrors({});
    try {
      const share = await create.mutateAsync({
        fileId: file.id,
        access,
        expiresInHours: expiry ? Number(expiry) : null,
        password: access === 'private' ? password : null,
        maxDownloads: max,
      });
      setLastCreated(share.id);
      setPassword('');
      await copyText(shareUrl(share), 'Đã tạo và sao chép link chia sẻ');
    } catch (err) {
      setErrors(fieldErrors(err));
      if (!Object.keys(fieldErrors(err)).length) toast.error(errorMessage(err));
    }
  };

  const doRevoke = async (s: Share) => {
    const ok = await confirm({
      title: 'Thu hồi link chia sẻ?',
      body: 'Người đang giữ link sẽ không mở được file nữa. Thao tác này không hoàn tác được.',
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

  return (
    <Dialog
      open={!!file}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          reset();
        }
      }}
      size="lg"
      title="Chia sẻ file"
      description={file?.name}
    >
      <form onSubmit={submit} className="grid gap-4 rounded-box border border-line bg-surface-2/60 p-4 sm:grid-cols-3">
        <div role="radiogroup" aria-label="Ai có thể mở link" className="grid gap-2 sm:col-span-3 sm:grid-cols-2">
          {ACCESS_OPTIONS.map((o) => {
            const Icon = o.icon;
            const on = access === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setAccess(o.value);
                  setErrors({});
                }}
                className={`flex items-start gap-3 rounded-ctl border px-3 py-2.5 text-left transition-colors ${on ? 'border-accent bg-accent-soft/40' : 'border-line hover:border-line-strong'}`}
              >
                <Icon size={18} weight="bold" className={`mt-0.5 shrink-0 ${on ? 'text-accent-text' : 'text-ink-2'}`} />
                <span>
                  <span className="block text-[13.5px] font-medium text-ink">{o.label}</span>
                  <span className="block text-[12px] text-ink-2">{o.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        <Field label="Hạn dùng" htmlFor={ids.expiry}>
          <Select id={ids.expiry} value={expiry} onChange={(e) => setExpiry(e.target.value)}>
            {EXPIRY.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {access === 'private' ? (
          <Field label="Mật khẩu" htmlFor={ids.pw} error={errors.password} hint="Gửi mật khẩu này cho người nhận">
            <Input id={ids.pw} type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} placeholder="Tối thiểu 4 ký tự" />
          </Field>
        ) : null}
        <Field label="Giới hạn lượt tải" htmlFor={ids.max} error={errors.maxDownloads} hint="Để trống nếu không giới hạn">
          <Input id={ids.max} inputMode="numeric" value={maxDl} onChange={(e) => setMaxDl(e.target.value.replace(/\D/g, ''))} invalid={!!errors.maxDownloads} placeholder="Ví dụ 10" />
        </Field>
        <div className="flex items-center justify-between gap-3 sm:col-span-3">
          <p className="text-[12.5px] text-ink-2">Link có giới hạn lượt tải sẽ không cho xem trước, để không ai lách được giới hạn.</p>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Tạo link
          </Button>
        </div>
      </form>

      <h3 className="mb-2 mt-6 text-[13px] font-semibold text-ink">Link đã tạo</h3>
      {shares.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : shares.data?.length ? (
        <ul className="space-y-2" data-testid="share-links">
          {shares.data.map((s) => (
            <LinkRow key={s.id} s={s} highlight={s.id === lastCreated} onRevoke={() => void doRevoke(s)} />
          ))}
        </ul>
      ) : (
        <p className="rounded-ctl border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-ink-2">
          Chưa có link nào. File của bạn hiện chỉ mình bạn xem được.
        </p>
      )}
    </Dialog>
  );
}

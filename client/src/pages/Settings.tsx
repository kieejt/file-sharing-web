import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Desktop, Moon, Sun } from '@phosphor-icons/react';
import { api, errorMessage, fieldErrors, type AuthResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme, type ThemePref } from '@/lib/theme';
import { formatBytes, formatDate } from '@/lib/format';
import type { User } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { Button, Field, Input, Meter, cx, useFieldId } from '@/components/ui';

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[260px_1fr]">
      <div>
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-[13px] text-ink-2">{description}</p>
      </div>
      <div className="max-w-md">{children}</div>
    </section>
  );
}

function ProfileForm({ user }: { user: User }) {
  const qc = useQueryClient();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const id = useFieldId('name');
  const emailId = useFieldId('email');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const r = await api.patch<{ user: User }>('/auth/me', { name });
      qc.setQueryData(['me'], r.data.user);
      toast.success('Đã cập nhật hồ sơ');
    } catch (err) {
      setError(fieldErrors(err).name ?? errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Họ và tên" htmlFor={id} error={error}>
        <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} invalid={!!error} autoComplete="name" />
      </Field>
      <Field label="Email" htmlFor={emailId} hint="Email dùng để đăng nhập, không thể thay đổi.">
        <Input id={emailId} value={user.email} disabled readOnly />
      </Field>
      <Button type="submit" variant="primary" loading={busy} disabled={name.trim() === user.name}>
        Lưu thay đổi
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { adoptSession } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const ids = { cur: useFieldId('cur'), next: useFieldId('next'), conf: useFieldId('conf') };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setErrors({ confirm: 'Mật khẩu nhập lại không khớp' });
    setBusy(true);
    setErrors({});
    try {
      const r = await api.post<AuthResponse>('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      adoptSession(r.data);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.');
    } catch (err) {
      const f = fieldErrors(err);
      setErrors(Object.keys(f).length ? f : { currentPassword: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Mật khẩu hiện tại" htmlFor={ids.cur} error={errors.currentPassword}>
        <Input id={ids.cur} type="password" value={form.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" invalid={!!errors.currentPassword} required />
      </Field>
      <Field label="Mật khẩu mới" htmlFor={ids.next} error={errors.newPassword} hint="Ít nhất 8 ký tự, gồm cả chữ và số.">
        <Input id={ids.next} type="password" value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" invalid={!!errors.newPassword} required />
      </Field>
      <Field label="Nhập lại mật khẩu mới" htmlFor={ids.conf} error={errors.confirm}>
        <Input id={ids.conf} type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" invalid={!!errors.confirm} required />
      </Field>
      <Button type="submit" variant="primary" loading={busy}>
        Đổi mật khẩu
      </Button>
    </form>
  );
}

function ThemePicker() {
  const { pref, set } = useTheme();
  const options: [ThemePref, string, typeof Sun][] = [
    ['light', 'Sáng', Sun],
    ['dark', 'Tối', Moon],
    ['system', 'Theo hệ thống', Desktop],
  ];
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Giao diện">
      {options.map(([v, label, Icon]) => (
        <button
          key={v}
          role="radio"
          aria-checked={pref === v}
          onClick={() => set(v)}
          className={cx(
            'flex flex-col items-center gap-2 rounded-box border px-3 py-4 text-[13px] transition-colors',
            pref === v ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
          )}
        >
          <Icon size={20} weight={pref === v ? 'fill' : 'bold'} />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  useEffect(() => {
    document.title = 'Cài đặt - FileShare';
  }, []);
  if (!user) return null;
  return (
    <div className="max-w-4xl">
      <PageHeader title="Cài đặt tài khoản" description={`Thành viên từ ${formatDate(user.createdAt)}`} />
      <div>
        <Section title="Hồ sơ" description="Tên hiển thị cho người nhận link chia sẻ của bạn.">
          <ProfileForm user={user} />
        </Section>
        <Section title="Mật khẩu" description="Đổi mật khẩu sẽ đăng xuất mọi thiết bị khác.">
          <PasswordForm />
        </Section>
        <Section title="Dung lượng" description="Bao gồm cả các file đang nằm trong thùng rác.">
          <p className="tabular text-[22px] font-semibold tracking-tight text-ink">
            {formatBytes(user.storageUsed)} <span className="text-[14px] font-normal text-ink-2">/ {formatBytes(user.storageQuota)}</span>
          </p>
          <Meter value={user.storageUsed} max={user.storageQuota} className="mt-3" />
          <p className="mt-2 text-[12.5px] text-ink-2">Cần thêm dung lượng? Liên hệ quản trị viên để được nâng hạn mức.</p>
        </Section>
        <Section title="Giao diện" description="Chọn chế độ sáng, tối hoặc theo cài đặt của thiết bị.">
          <ThemePicker />
        </Section>
      </div>
    </div>
  );
}

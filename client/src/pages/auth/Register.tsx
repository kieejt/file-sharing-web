import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check } from '@phosphor-icons/react';
import { errorMessage, fieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Field, Input, cx, useFieldId } from '@/components/ui';
import { AuthLayout, PasswordToggle } from './AuthLayout';

const RULES = [
  { test: (p: string) => p.length >= 8, label: 'Ít nhất 8 ký tự' },
  { test: (p: string) => /[A-Za-z]/.test(p), label: 'Có chữ cái' },
  { test: (p: string) => /\d/.test(p), label: 'Có chữ số' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ids = { name: useFieldId('name'), email: useFieldId('email'), pw: useFieldId('pw') };

  useEffect(() => {
    document.title = 'Đăng ký - FileShare';
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(undefined);
    try {
      await register(form.name, form.email, form.password);
      navigate('/drive', { replace: true });
    } catch (err) {
      const f = fieldErrors(err);
      if (Object.keys(f).length) setErrors(f);
      else setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Miễn phí 2 GB lưu trữ, không cần thẻ thanh toán."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-medium text-accent-text hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError ? (
          <p className="rounded-ctl bg-danger-soft px-3 py-2.5 text-[13px] text-danger" role="alert">
            {formError}
          </p>
        ) : null}
        <Field label="Họ và tên" htmlFor={ids.name} error={errors.name}>
          <Input id={ids.name} autoComplete="name" value={form.name} onChange={set('name')} invalid={!!errors.name} required autoFocus />
        </Field>
        <Field label="Email" htmlFor={ids.email} error={errors.email}>
          <Input id={ids.email} type="email" autoComplete="email" value={form.email} onChange={set('email')} invalid={!!errors.email} required />
        </Field>
        <Field label="Mật khẩu" htmlFor={ids.pw} error={errors.password} aside={<PasswordToggle shown={show} onToggle={() => setShow((v) => !v)} />}>
          <Input id={ids.pw} type={show ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={set('password')} invalid={!!errors.password} required />
        </Field>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]" aria-label="Yêu cầu mật khẩu">
          {RULES.map((r) => {
            const ok = r.test(form.password);
            return (
              <li key={r.label} className={cx('flex items-center gap-1.5 transition-colors', ok ? 'text-success' : 'text-ink-2')}>
                <Check size={13} weight="bold" className={ok ? '' : 'opacity-30'} />
                {r.label}
              </li>
            );
          })}
        </ul>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Tạo tài khoản
        </Button>
      </form>
    </AuthLayout>
  );
}

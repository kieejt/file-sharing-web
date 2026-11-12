import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { errorMessage, fieldErrors } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Field, Input, useFieldId } from '@/components/ui';
import { AuthLayout, PasswordToggle } from './AuthLayout';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/drive';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ids = { email: useFieldId('email'), pw: useFieldId('pw') };

  useEffect(() => {
    document.title = 'Đăng nhập - FileShare';
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(undefined);
    try {
      await login(email, password);
      navigate(from, { replace: true });
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
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay lại FileShare."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-medium text-accent-text hover:underline">
            Đăng ký miễn phí
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
        <Field label="Email" htmlFor={ids.email} error={errors.email}>
          <Input id={ids.email} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} required autoFocus />
        </Field>
        <Field label="Mật khẩu" htmlFor={ids.pw} error={errors.password} aside={<PasswordToggle shown={show} onToggle={() => setShow((v) => !v)} />}>
          <Input id={ids.pw} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} required />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          Đăng nhập
        </Button>
        {import.meta.env.DEV ? (
          <p className="rounded-ctl border border-dashed border-line-strong px-3 py-2.5 text-[12.5px] text-ink-2">
            Chạy local với <code className="font-mono">npm run dev:mem</code>: dùng tài khoản <code className="font-mono text-ink">demo@fileshare.vn</code> / <code className="font-mono text-ink">Demo12345</code>
          </p>
        ) : null}
      </form>
    </AuthLayout>
  );
}

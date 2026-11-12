import { useEffect } from 'react';
import { Link } from 'react-router';
import { Logo } from '@/components/Logo';
import { StackArt } from '@/components/ui';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Không tìm thấy trang - FileShare';
  }, []);
  return (
    <div className="flex min-h-[100dvh] flex-col px-6 py-6">
      <Logo />
      <div className="enter m-auto flex max-w-sm flex-col items-center text-center">
        <StackArt />
        <p className="mt-6 font-mono text-[13px] text-ink-3">404</p>
        <h1 className="mt-1 text-[20px] font-semibold tracking-tight text-ink">Trang này không tồn tại</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-2">Đường dẫn có thể đã bị đổi hoặc gõ nhầm.</p>
        <Link to="/" className="mt-6 inline-flex h-9 items-center rounded-ctl bg-primary px-4 text-[14px] font-medium text-on-primary hover:bg-primary-hover">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

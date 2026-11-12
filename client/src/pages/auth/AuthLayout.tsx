import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: ReactNode; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="enter text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
          <p className="enter mt-1.5 text-[14px] text-ink-2" style={{ ['--i' as string]: 1 }}>
            {subtitle}
          </p>
          <div className="enter mt-8" style={{ ['--i' as string]: 2 }}>
            {children}
          </div>
          <div className="mt-8 text-[13.5px] text-ink-2">{footer}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-line bg-surface-2 lg:block" aria-hidden>
        <div className="flex h-full flex-col justify-center gap-8 py-16 pl-14">
          <p className="max-w-md text-[22px] font-semibold leading-snug tracking-tight text-ink">
            Tài liệu của bạn ở một chỗ. Chia sẻ đúng người, đúng thời hạn.
          </p>
          <img
            src="/landing/drive-light.webp"
            alt=""
            width={1440}
            height={900}
            className="w-[150%] max-w-none rounded-l-box border border-r-0 border-line shadow-pop dark:hidden"
          />
          <img
            src="/landing/drive-dark.webp"
            alt=""
            width={1440}
            height={900}
            className="hidden w-[150%] max-w-none rounded-l-box border border-r-0 border-line shadow-pop dark:block"
          />
        </div>
      </aside>
    </div>
  );
}

export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="text-[12.5px] font-medium text-accent-text hover:underline" aria-pressed={shown}>
      {shown ? 'Ẩn' : 'Hiện'}
    </button>
  );
}

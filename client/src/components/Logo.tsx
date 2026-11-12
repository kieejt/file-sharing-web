import { Link } from 'react-router';

/** Dấu nhận diện: tờ tài liệu gấp góc trên nền vuông. Một khối hình học đơn giản. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="7" fill="var(--primary)" />
      <path d="M10 8h8l5 5v11H10z" fill="var(--bg)" />
      <path d="M18 8v5h5" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 rounded-ctl text-[15px] font-semibold tracking-tight text-ink">
      <LogoMark />
      FileShare
    </Link>
  );
}

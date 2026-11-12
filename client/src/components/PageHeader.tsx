import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions, before }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; before?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {before}
        <h1 className="truncate text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-[65ch] text-[13.5px] text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import * as RDialog from '@radix-ui/react-dialog';
import * as RMenu from '@radix-ui/react-dropdown-menu';
import { X } from '@phosphor-icons/react';
import { KIND_META, badgeText } from '@/lib/kinds';
import type { FileKind } from '@/lib/types';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ Button */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  accent: 'bg-accent text-white hover:bg-accent-hover dark:text-[#10162a]',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-[#1b0d0c]',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-ctl font-medium transition-[background-color,transform,opacity] duration-150 active:translate-y-px disabled:opacity-50 disabled:active:translate-y-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Dots /> : icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md' }>(
  function IconButton({ label, className, size = 'md', children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cx(
          'inline-flex shrink-0 items-center justify-center rounded-ctl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink active:translate-y-px disabled:opacity-40',
          size === 'sm' ? 'size-7' : 'size-9',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

/** Chỉ báo đang xử lý gọn trong nút (thay cho spinner tròn). */
export function Dots() {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="skeleton size-1 rounded-full bg-current" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------- Field */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  aside,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  htmlFor: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-2">{hint}</p>
      ) : null}
    </div>
  );
}

const control =
  'w-full rounded-ctl border bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cx(control, 'h-10', invalid ? 'border-danger' : 'border-line-strong', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(control, 'min-h-20 border-line-strong py-2 leading-relaxed', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(control, 'h-10 border-line-strong pr-8', className)} {...rest}>
      {children}
    </select>
  );
});

export function Checkbox({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: string; className?: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className={cx('size-4 shrink-0 cursor-pointer rounded-[4px] accent-[var(--accent)]', className)}
    />
  );
}

export function useFieldId(prefix: string) {
  return `${prefix}-${useId().replace(/:/g, '')}`;
}

/* ------------------------------------------------------------------ Dialog */

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const width = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-5xl' }[size];
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fade-in fixed inset-0 z-40 bg-overlay" />
        <RDialog.Content
          className={cx(
            'pop-in fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-box border border-line bg-surface shadow-pop focus:outline-none',
            width,
          )}
          aria-describedby={description ? undefined : undefined}
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
            <div className="min-w-0">
              <RDialog.Title className="truncate text-[15px] font-semibold text-ink">{title}</RDialog.Title>
              {description ? <RDialog.Description className="mt-0.5 text-[13px] text-ink-2">{description}</RDialog.Description> : null}
            </div>
            <RDialog.Close asChild>
              <IconButton label="Đóng" size="sm" className="-mr-1.5">
                <X size={16} weight="bold" />
              </IconButton>
            </RDialog.Close>
          </div>
          {children ? <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div> : null}
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/* -------------------------------------------------------------------- Menu */

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export function Menu({ trigger, items, align = 'end' }: { trigger: ReactNode; items: MenuItem[]; align?: 'start' | 'end' }) {
  return (
    <RMenu.Root modal={false}>
      <RMenu.Trigger asChild>{trigger}</RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content
          align={align}
          sideOffset={4}
          className="pop-in z-50 min-w-48 rounded-box border border-line bg-surface p-1 shadow-pop"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <div key={it.label}>
              {it.separatorBefore ? <RMenu.Separator className="my-1 h-px bg-line" /> : null}
              <RMenu.Item
                disabled={it.disabled}
                onSelect={it.onSelect}
                className={cx(
                  'flex h-8 cursor-pointer select-none items-center gap-2.5 rounded-[5px] px-2.5 text-[13px] outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-40',
                  it.danger ? 'text-danger' : 'text-ink',
                )}
              >
                <span className={cx('flex w-4 justify-center', it.danger ? '' : 'text-ink-2')}>{it.icon}</span>
                {it.label}
              </RMenu.Item>
            </div>
          ))}
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  );
}

/* ------------------------------------------------------------- File badge */

export function FileBadge({ name, kind, size = 'md' }: { name: string; kind: FileKind; size?: 'sm' | 'md' | 'lg' }) {
  const meta = KIND_META[kind];
  const dims = { sm: 'h-7 w-7 text-[8.5px]', md: 'h-9 w-9 text-[9.5px]', lg: 'h-14 w-14 text-[12px]' }[size];
  return (
    <span
      className={cx('tone-' + meta.tone, dims, 'inline-flex shrink-0 select-none items-center justify-center rounded-[7px] font-mono font-bold tracking-tight')}
      aria-label={meta.label}
    >
      {badgeText(name, kind)}
    </span>
  );
}

export function Pill({ tone = 'stone', children }: { tone?: 'blue' | 'red' | 'green' | 'yellow' | 'stone' | 'accent'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-medium',
        tone === 'accent' ? 'bg-accent-soft text-accent-text' : 'tone-' + tone,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------- States, misc */

export function Skeleton({ className }: { className?: string }) {
  return <span className={cx('skeleton block', className)} aria-hidden />;
}

export function EmptyState({ title, body, action, art }: { title: string; body?: ReactNode; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="enter mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
      {art}
      <h3 className="mt-5 text-[15px] font-semibold text-ink">{title}</h3>
      {body ? <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Minh hoạ trạng thái rỗng: chồng thẻ tài liệu bằng khối hình học đơn giản (không icon). */
export function StackArt() {
  return (
    <div className="relative h-20 w-24" aria-hidden>
      <span className="absolute left-2 top-3 h-16 w-14 -rotate-6 rounded-[8px] border border-line bg-surface-2" />
      <span className="absolute left-8 top-1 h-16 w-14 rotate-3 rounded-[8px] border border-line bg-surface" />
      <span className="tone-blue absolute left-11 top-4 h-2 w-7 rounded-full" />
      <span className="absolute left-11 top-8 h-1.5 w-8 rounded-full bg-surface-3" />
      <span className="absolute left-11 top-11 h-1.5 w-5 rounded-full bg-surface-3" />
    </div>
  );
}

export function Meter({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const tone = pct > 90 ? 'bg-danger' : pct > 75 ? 'bg-warning' : 'bg-accent';
  return (
    <div
      className={cx('h-1.5 overflow-hidden rounded-full bg-surface-3', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-500', tone)} style={{ width: `${Math.max(pct, value > 0 ? 1.5 : 0)}%` }} />
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}

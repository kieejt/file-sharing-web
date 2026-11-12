import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button, Dialog } from './ui';

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Hộp thoại xác nhận dạng Promise: `if (await confirm({...})) ...` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(undefined);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = undefined;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!opts}
        onOpenChange={(v) => !v && close(false)}
        size="sm"
        title={opts?.title ?? ''}
        description={opts?.body}
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Huỷ
            </Button>
            <Button variant={opts?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
              {opts?.confirmLabel ?? 'Xác nhận'}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const c = useContext(ConfirmContext);
  if (!c) throw new Error('useConfirm must be used inside ConfirmProvider');
  return c;
}

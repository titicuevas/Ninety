import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dismissModal } from '@/lib/modalDismiss';
import { cn } from '@/lib/utils';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Clases del panel (no del overlay). */
  className?: string;
  /** Oculta el botón Cerrar del header (p. ej. si el caller lo pone aparte). */
  hideCloseButton?: boolean;
  closeLabel?: string;
};

/**
 * Modal controlado por React vía portal.
 * Evita los fallos de `<dialog showModal>` con overlay/pointer-events/z-index.
 * Cerrar, Escape y click en backdrop siempre llaman onClose (busy no bloquea).
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  className,
  hideCloseButton = false,
  closeLabel = 'Cerrar',
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismissModal({ onClose });
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const close = () => dismissModal({ onClose });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 z-0 bg-black/70"
        aria-hidden="true"
        onClick={close}
      />
      {/* Glow esmeralda — marca Ninety, sin purple */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_65%)]"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-10 flex max-h-[min(85dvh,34rem)] w-[min(100%,26rem)] flex-col overflow-hidden',
          'rounded-2xl border border-primary/25 bg-card text-card-foreground',
          'shadow-[0_24px_64px_-16px_rgba(0,0,0,0.75),0_0_0_1px_rgba(16,185,129,0.08)]',
          'bg-gradient-to-b from-emerald-950/40 via-card to-card',
          'pointer-events-auto',
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-primary/15 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="h-5 w-1 shrink-0 rounded-full bg-primary shadow-[0_0_12px_rgba(16,185,129,0.55)]"
              aria-hidden
            />
            <h2
              id={titleId}
              className="truncate text-[0.95rem] font-semibold tracking-tight text-foreground sm:text-base"
            >
              {title}
            </h2>
          </div>
          {hideCloseButton ? null : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 border-border/80 bg-secondary/80 px-3 text-foreground hover:border-primary/40 hover:bg-secondary hover:text-primary"
              onClick={close}
              aria-label={closeLabel}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              {closeLabel}
            </Button>
          )}
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

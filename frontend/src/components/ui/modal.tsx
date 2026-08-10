import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay dedicado: pointer-events propios, no compite con el panel */}
      <div
        className="absolute inset-0 z-0 bg-black/60"
        aria-hidden="true"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-10 flex max-h-[min(85dvh,32rem)] w-[min(100%,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl pointer-events-auto',
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            {title}
          </h2>
          {hideCloseButton ? null : (
            <Button type="button" variant="ghost" size="sm" onClick={close}>
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

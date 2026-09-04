import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react';
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
  /** id del texto de apoyo (`aria-describedby`). */
  describedBy?: string;
};

function focusIfPresent(el: HTMLElement | null) {
  if (!el || !document.contains(el) || typeof el.focus !== 'function') return;
  el.focus();
}

/**
 * Modal nativo `<dialog showModal>` con portal (z-index / overlay estables).
 * Escape, foco atrapado y backdrop los aporta el browser; al cerrar se restaura
 * el foco al control que abrió el diálogo. onClose siempre se notifica.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  className,
  hideCloseButton = false,
  closeLabel = 'Cerrar',
  describedBy,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseEvent = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }

    let closedByCleanup = false;
    const active = document.activeElement;
    restoreFocusRef.current = active instanceof HTMLElement ? active : null;

    if (!dialog.open) dialog.showModal();

    const restoreFocus = () => {
      const el = restoreFocusRef.current;
      restoreFocusRef.current = null;
      focusIfPresent(el);
    };

    const onBackdropClick = (event: MouseEvent) => {
      if (event.target === dialog) {
        dismissModal({ onClose: () => dialog.close() });
      }
    };

    const onDialogClose = () => {
      restoreFocus();
      if (!closedByCleanup) onCloseEvent();
    };

    dialog.addEventListener('click', onBackdropClick);
    dialog.addEventListener('close', onDialogClose);

    return () => {
      closedByCleanup = true;
      dialog.removeEventListener('click', onBackdropClick);
      dialog.removeEventListener('close', onDialogClose);
      if (dialog.open) dialog.close();
      restoreFocus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const close = () => {
    dismissModal({
      onClose: () => dialogRef.current?.close(),
    });
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      aria-modal="true"
      className={cn(
        'fixed inset-0 z-[100] m-0 flex h-full max-h-none w-full max-w-none items-center justify-center',
        'border-0 bg-transparent px-[max(1rem,env(safe-area-inset-left,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] open:flex sm:p-6',
        '[&::backdrop]:bg-black/70',
      )}
    >
      {/* Glow esmeralda — marca Ninety, sin purple */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.12),transparent_65%)]"
        aria-hidden="true"
      />
      <div
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
    </dialog>,
    document.body,
  );
}

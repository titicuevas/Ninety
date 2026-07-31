import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** destructive = borrado; default = acción primaria */
  tone?: 'destructive' | 'default';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Diálogo modal in-app (sin window.confirm). Esc / Cancelar cierran. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'destructive',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'fixed inset-0 z-50 m-auto w-[min(100%-2rem,24rem)] rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-xl',
        'backdrop:bg-black/60 open:flex open:flex-col',
      )}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) onCancel();
      }}
    >
      <div className="space-y-4 p-5 sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="space-y-2">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'destructive' ? 'destructive' : 'default'}
            className="min-h-11"
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

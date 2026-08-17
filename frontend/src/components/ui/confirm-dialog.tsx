import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

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

/**
 * Confirmación in-app vía Modal (portal).
 * Esc / backdrop / Cancelar siempre pueden salir — `busy` no atrapa el cierre.
 */
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
  const descriptionId = useId();

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      hideCloseButton
      describedBy={description ? descriptionId : undefined}
    >
      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        {description ? (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11"
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
    </Modal>
  );
}

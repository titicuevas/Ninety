import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Props = {
  open: boolean;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Diálogo compartido al salir con cambios sin guardar. */
export function DirtyLeaveDialog({ open, description, onConfirm, onCancel }: Props) {
  return (
    <ConfirmDialog
      open={open}
      title="¿Salir sin guardar?"
      description={description}
      confirmLabel="Salir"
      cancelLabel="Seguir editando"
      tone="default"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

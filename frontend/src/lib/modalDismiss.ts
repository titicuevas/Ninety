/**
 * Contrato de cierre de modales: siempre notifica a React.
 * `busy` se acepta y se ignora a propósito — Cerrar/Esc/backdrop
 * no deben quedar atrapados por loading.
 */
export type ModalDismissOptions = {
  onClose: () => void;
  /** Si queda un `<dialog>` nativo, cerrarlo también. */
  closeNative?: (() => void) | null;
  busy?: boolean;
};

export function dismissModal({ onClose, closeNative }: ModalDismissOptions): void {
  closeNative?.();
  onClose();
}

/** Etiqueta del toggle bloquear / desbloquear usuario. */
export function blockUserButtonLabel(options: {
  blocked: boolean;
  /** true mientras corre POST (bloquear). */
  blocking?: boolean;
  /** true mientras corre DELETE (desbloquear). */
  unblocking?: boolean;
}): string {
  if (options.unblocking) return 'Desbloqueando…';
  if (options.blocking) return 'Bloqueando…';
  if (options.blocked) return 'Desbloquear';
  return 'Bloquear';
}

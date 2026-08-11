/** Etiqueta del toggle silenciar / dejar de silenciar alertas de un usuario. */
export function muteUserButtonLabel(options: {
  muted: boolean;
  /** true mientras corre POST (silenciar). */
  muting?: boolean;
  /** true mientras corre DELETE (dejar de silenciar). */
  unmuting?: boolean;
}): string {
  if (options.unmuting) return 'Reactivando…';
  if (options.muting) return 'Silenciando…';
  if (options.muted) return 'Dejar de silenciar';
  return 'Silenciar alertas';
}

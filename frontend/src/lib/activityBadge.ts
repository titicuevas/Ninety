/** Etiqueta del badge de actividad (atajos Home/Feed). */
export function formatActivityBadgeCount(total: number): string | null {
  if (total <= 0) return null;
  if (total > 9) return '9+';
  return String(total);
}

/** aria-label accesible para el atajo Actividad. */
export function activityShortcutAriaLabel(total: number): string {
  if (total <= 0) return 'Actividad';
  if (total === 1) return 'Actividad (1 evento)';
  if (total > 9) return 'Actividad (más de 9 eventos)';
  return `Actividad (${total} eventos)`;
}

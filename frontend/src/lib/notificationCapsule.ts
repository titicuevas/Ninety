/** Contexto de Capsule en filas de notificaciones (like / comment). */

export interface NotificationCapsuleContext {
  id: string;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  thumb_url: string | null;
}

/** "Betis vs Sevilla" */
export function formatNotificationMatch(capsule: {
  home_team_name: string;
  away_team_name: string;
}): string {
  return `${capsule.home_team_name} vs ${capsule.away_team_name}`;
}

/** "Betis vs Sevilla · LaLiga" */
export function formatNotificationMatchContext(capsule: {
  home_team_name: string;
  away_team_name: string;
  competition_name?: string | null;
}): string {
  const match = formatNotificationMatch(capsule);
  const competition = capsule.competition_name?.trim();
  return competition ? `${match} · ${competition}` : match;
}

/**
 * Etiqueta accesible de la fila: actor + acción + partido.
 * Ej. "Ana le gustó tu cápsula · Betis vs Sevilla · LaLiga"
 */
export function formatNotificationAriaLabel(params: {
  actorName: string;
  actionText: string;
  capsule?: NotificationCapsuleContext | null;
  snippet?: string | null;
}): string {
  const parts = [`${params.actorName} ${params.actionText}`];
  if (params.capsule) {
    parts.push(formatNotificationMatchContext(params.capsule));
  }
  const snippet = params.snippet?.trim();
  if (snippet) parts.push(`«${snippet}»`);
  return parts.join(' · ');
}

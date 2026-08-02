/** Contexto de Capsule embebido en notificaciones in-app y push. */

export type CapsuleNotificationRow = {
  id: string;
  home_team_name: string | null;
  away_team_name: string | null;
  competition_name: string | null;
  photo_urls?: string[] | null;
  photo_url?: string | null;
};

export type NotificationCapsule = {
  id: string;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  thumb_url: string | null;
};

export function pickCapsuleThumbUrl(row: {
  photo_urls?: string[] | null;
  photo_url?: string | null;
}): string | null {
  if (Array.isArray(row.photo_urls)) {
    for (const url of row.photo_urls) {
      if (typeof url === 'string' && url.trim()) return url.trim();
    }
  }
  if (typeof row.photo_url === 'string' && row.photo_url.trim()) {
    return row.photo_url.trim();
  }
  return null;
}

export function mapNotificationCapsule(
  row: CapsuleNotificationRow | null | undefined,
): NotificationCapsule | null {
  if (!row?.id) return null;
  const home = row.home_team_name?.trim() ?? '';
  const away = row.away_team_name?.trim() ?? '';
  if (!home || !away) return null;

  const competition = row.competition_name?.trim() || null;
  return {
    id: row.id,
    home_team_name: home,
    away_team_name: away,
    competition_name: competition,
    thumb_url: pickCapsuleThumbUrl(row),
  };
}

/** "Betis vs Sevilla" */
export function formatMatchLabel(capsule: {
  home_team_name: string;
  away_team_name: string;
}): string {
  return `${capsule.home_team_name} vs ${capsule.away_team_name}`;
}

/** "Betis vs Sevilla · LaLiga" */
export function formatMatchContext(capsule: {
  home_team_name: string;
  away_team_name: string;
  competition_name?: string | null;
}): string {
  const match = formatMatchLabel(capsule);
  const competition = capsule.competition_name?.trim();
  return competition ? `${match} · ${competition}` : match;
}

type PushType = 'like' | 'follow' | 'comment';

/**
 * Cuerpo del push. Si hay partido, lo incluye para que el inbox del SO
 * diga qué Capsule recibió engagement.
 */
export function buildNotificationPushBody(params: {
  type: PushType;
  actorName: string;
  matchLabel?: string | null;
  commentSnippet?: string | null;
}): string {
  const { type, actorName } = params;
  const match = params.matchLabel?.trim() || null;
  const snippet = params.commentSnippet?.trim() || null;

  if (type === 'follow') {
    return `${actorName} te empezó a seguir`;
  }

  if (type === 'like') {
    return match
      ? `A ${actorName} le gustó ${match}`
      : `A ${actorName} le gustó tu cápsula`;
  }

  // comment
  if (match && snippet) return `${actorName} en ${match}: «${snippet}»`;
  if (match) return `${actorName} comentó en ${match}`;
  if (snippet) return `${actorName}: «${snippet}»`;
  return `${actorName} comentó en tu cápsula`;
}

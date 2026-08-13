/** Agrupa notificaciones del mismo tipo/cápsula en el centro de alertas (digest V7). */

export type DigestNotificationType = 'like' | 'follow' | 'comment' | 'mention' | 'collection_like';

export interface DigestActor {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  /** true si el viewer ya sigue a este actor (follows del digest). */
  followed_by_me?: boolean;
}

export interface DigestNotificationInput {
  id: string;
  type: DigestNotificationType;
  actor_id: string;
  capsule_id: string | null;
  collection_id?: string | null;
  body?: string | null;
  read: boolean;
  created_at: string;
  actor: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    followed_by_me?: boolean;
  } | null;
  capsule?: {
    id: string;
    home_team_name: string;
    away_team_name: string;
    competition_name: string | null;
    thumb_url: string | null;
  } | null;
  collection?: {
    id: string;
    name: string;
  } | null;
}

export interface NotificationDigestGroup {
  key: string;
  type: DigestNotificationType;
  capsule_id: string | null;
  collection_id: string | null;
  /** Más reciente primero. */
  notifications: DigestNotificationInput[];
  /** Actores únicos, orden de aparición (más reciente primero). */
  actors: DigestActor[];
  unread: boolean;
  created_at: string;
  capsule: DigestNotificationInput['capsule'];
  collection: DigestNotificationInput['collection'];
  /** Snippet del comentario más reciente (comment | mention). */
  latestBody: string | null;
}

export function notificationDigestKey(
  n: Pick<DigestNotificationInput, 'type' | 'capsule_id' | 'collection_id'>,
): string {
  if (n.type === 'follow') return 'follow';
  if (n.type === 'collection_like') {
    const collection = n.collection_id?.trim();
    return collection ? `collection_like:${collection}` : 'collection_like:none';
  }
  const capsule = n.capsule_id?.trim();
  return capsule ? `${n.type}:${capsule}` : `${n.type}:none`;
}

function actorLabel(actor: DigestActor): string {
  if (actor.display_name?.trim()) return actor.display_name.trim();
  if (actor.username?.trim()) return `@${actor.username.trim()}`;
  return 'Alguien';
}

/**
 * "Ana" | "Ana y Luis" | "Ana, Luis y 3 más"
 */
export function formatDigestActorNames(
  actors: DigestActor[],
  options?: { maxNamed?: number },
): string {
  const maxNamed = options?.maxNamed ?? 2;
  const names = actors.map(actorLabel);
  if (names.length === 0) return 'Alguien';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  const shown = names.slice(0, maxNamed);
  const rest = names.length - shown.length;
  if (rest <= 0) return shown.join(', ');
  if (shown.length === 1) return `${shown[0]} y ${rest} más`;
  return `${shown.slice(0, -1).join(', ')}, ${shown[shown.length - 1]} y ${rest} más`;
}

export function digestActionText(type: DigestNotificationType, actorCount: number): string {
  const plural = actorCount > 1;
  switch (type) {
    case 'like':
      return plural ? 'les gustó tu cápsula' : 'le gustó tu cápsula';
    case 'collection_like':
      return plural ? 'les gustó tu lista' : 'le gustó tu lista';
    case 'comment':
      return plural ? 'comentaron en tu cápsula' : 'comentó en tu cápsula';
    case 'mention':
      return plural ? 'te mencionaron en un comentario' : 'te mencionó en un comentario';
    case 'follow':
      return plural ? 'te empezaron a seguir' : 'te empezó a seguir';
  }
}

/**
 * Agrupa likes/comentarios por cápsula y follows entre sí.
 * El orden de grupos sigue el evento más reciente de cada bucket.
 */
export function groupNotificationsForDigest(
  notifications: DigestNotificationInput[],
): NotificationDigestGroup[] {
  const buckets = new Map<string, DigestNotificationInput[]>();

  for (const n of notifications) {
    const key = notificationDigestKey(n);
    const list = buckets.get(key);
    if (list) {
      list.push(n);
    } else {
      buckets.set(key, [n]);
    }
  }

  const groups: NotificationDigestGroup[] = [];

  for (const [key, list] of buckets) {
    // Mantener más reciente primero (la API ya viene así; reforzamos por si hay paginación mezclada).
    const sorted = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const seenActors = new Set<string>();
    const actors: DigestActor[] = [];
    for (const n of sorted) {
      if (seenActors.has(n.actor_id)) continue;
      seenActors.add(n.actor_id);
      actors.push({
        id: n.actor_id,
        username: n.actor?.username ?? null,
        display_name: n.actor?.display_name ?? null,
        avatar_url: n.actor?.avatar_url ?? null,
        followed_by_me: n.actor?.followed_by_me === true,
      });
    }

    const head = sorted[0]!;
    const latestBody =
      (head.type === 'comment' || head.type === 'mention') && head.body?.trim()
        ? head.body.trim()
        : null;

    groups.push({
      key,
      type: head.type,
      capsule_id: head.capsule_id,
      collection_id: head.collection_id ?? null,
      notifications: sorted,
      actors,
      unread: sorted.some((n) => !n.read),
      created_at: head.created_at,
      capsule: head.capsule ?? null,
      collection: head.collection ?? null,
      latestBody,
    });
  }

  groups.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return groups;
}

export function digestUnreadIds(group: NotificationDigestGroup): string[] {
  const ids: string[] = [];
  for (const n of group.notifications) {
    if (!n.read) ids.push(n.id);
  }
  return ids;
}

/**
 * Actor único de un follow digest con username — candidato a «Seguir de vuelta».
 */
export function digestFollowBackActor(group: NotificationDigestGroup): DigestActor | null {
  if (group.type !== 'follow') return null;
  if (group.actors.length !== 1) return null;
  const actor = group.actors[0];
  if (!actor?.username?.trim()) return null;
  return actor;
}

import { buildNotificationPushBody } from './notificationCapsule.js';

export type DigestNotificationType = 'like' | 'follow' | 'comment' | 'mention' | 'collection_like';

export type PendingNotificationRow = {
  id: string;
  user_id: string;
  type: DigestNotificationType;
  actor_id: string;
  capsule_id: string | null;
  collection_id?: string | null;
  body?: string | null;
  created_at: string;
};

const PUSH_TITLE: Record<DigestNotificationType, string> = {
  like: 'Nuevo like',
  follow: 'Nuevo seguidor',
  comment: 'Nuevo comentario',
  mention: 'Te mencionaron',
  collection_like: 'Like en tu lista',
};

const TYPE_LABEL: Record<DigestNotificationType, string> = {
  like: 'like',
  follow: 'follow',
  comment: 'comentario',
  mention: 'mención',
  collection_like: 'like en lista',
};

const TYPE_LABEL_PLURAL: Record<DigestNotificationType, string> = {
  like: 'likes',
  follow: 'follows',
  comment: 'comentarios',
  mention: 'menciones',
  collection_like: 'likes en listas',
};

export function notificationDigestKey(
  n: Pick<PendingNotificationRow, 'type' | 'capsule_id' | 'collection_id'>,
): string {
  if (n.type === 'follow') return 'follow';
  if (n.type === 'collection_like') {
    const collection = n.collection_id?.trim();
    return collection ? `collection_like:${collection}` : 'collection_like:none';
  }
  const collection = n.collection_id?.trim();
  if (collection && (n.type === 'comment' || n.type === 'mention') && !n.capsule_id?.trim()) {
    return `${n.type}:collection:${collection}`;
  }
  const capsule = n.capsule_id?.trim();
  return capsule ? `${n.type}:${capsule}` : `${n.type}:none`;
}

function formatDigestActorNames(names: string[], maxNamed = 2): string {
  if (names.length === 0) return 'Alguien';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  const shown = names.slice(0, maxNamed);
  const rest = names.length - shown.length;
  if (shown.length === 1) return `${shown[0]} y ${rest} más`;
  return `${shown.slice(0, -1).join(', ')}, ${shown[shown.length - 1]} y ${rest} más`;
}

function digestActionText(
  type: DigestNotificationType,
  actorCount: number,
  onCollection = false,
): string {
  const plural = actorCount > 1;
  switch (type) {
    case 'like':
      return plural ? 'les gustó tu cápsula' : 'le gustó tu cápsula';
    case 'collection_like':
      return plural ? 'les gustó tu lista' : 'le gustó tu lista';
    case 'comment':
      if (onCollection) {
        return plural ? 'comentaron en tu lista' : 'comentó en tu lista';
      }
      return plural ? 'comentaron en tu cápsula' : 'comentó en tu cápsula';
    case 'mention':
      return plural ? 'te mencionaron en un comentario' : 'te mencionó en un comentario';
    case 'follow':
      return plural ? 'te empezaron a seguir' : 'te empezó a seguir';
  }
}

function countByType(notifications: PendingNotificationRow[]): Record<DigestNotificationType, number> {
  const counts: Record<DigestNotificationType, number> = {
    like: 0,
    comment: 0,
    follow: 0,
    mention: 0,
    collection_like: 0,
  };
  for (const n of notifications) {
    counts[n.type] += 1;
  }
  return counts;
}

function formatTypeBreakdown(counts: Record<DigestNotificationType, number>): string {
  const parts: string[] = [];
  for (const type of ['like', 'collection_like', 'comment', 'mention', 'follow'] as const) {
    const n = counts[type];
    if (n <= 0) continue;
    parts.push(`${n} ${n === 1 ? TYPE_LABEL[type] : TYPE_LABEL_PLURAL[type]}`);
  }
  return parts.join(', ');
}

type DigestGroup = {
  key: string;
  type: DigestNotificationType;
  capsule_id: string | null;
  collection_id: string | null;
  notifications: PendingNotificationRow[];
  actorNames: string[];
  latestBody: string | null;
};

function groupNotificationsForDigest(notifications: PendingNotificationRow[]): DigestGroup[] {
  const buckets = new Map<string, PendingNotificationRow[]>();

  for (const n of notifications) {
    const key = notificationDigestKey(n);
    const list = buckets.get(key);
    if (list) list.push(n);
    else buckets.set(key, [n]);
  }

  const groups: DigestGroup[] = [];

  for (const [key, list] of buckets) {
    const sorted = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const seenActors = new Set<string>();
    const actorNames: string[] = [];
    for (const n of sorted) {
      if (seenActors.has(n.actor_id)) continue;
      seenActors.add(n.actor_id);
      actorNames.push(n.actor_id);
    }
    const head = sorted[0]!;
    groups.push({
      key,
      type: head.type,
      capsule_id: head.capsule_id,
      collection_id: head.collection_id ?? null,
      notifications: sorted,
      actorNames,
      latestBody:
        (head.type === 'comment' || head.type === 'mention') && head.body?.trim()
          ? head.body.trim()
          : null,
    });
  }

  groups.sort(
    (a, b) =>
      new Date(b.notifications[0]!.created_at).getTime() -
      new Date(a.notifications[0]!.created_at).getTime(),
  );

  return groups;
}

function resolveActorName(actorId: string, actorNames: Map<string, string>): string {
  return actorNames.get(actorId) ?? 'Alguien';
}

/** Deep link al pulsar el push (espejo de NotificationsPage). */
export function resolvePushDigestUrl(params: {
  type: DigestNotificationType;
  capsule_id: string | null;
  collection_id?: string | null;
  actorIds: string[];
  actorUsernames: Map<string, string>;
}): string {
  const { type, capsule_id, collection_id, actorIds, actorUsernames } = params;

  if (type === 'follow' && actorIds.length === 1) {
    const username = actorUsernames.get(actorIds[0]!);
    return username ? `/u/${username}` : '/notifications';
  }

  if (type === 'collection_like' && collection_id) {
    return `/collections/${collection_id}`;
  }

  if ((type === 'comment' || type === 'mention') && collection_id && !capsule_id) {
    return `/collections/${collection_id}`;
  }

  if (capsule_id) {
    return type === 'comment' || type === 'mention'
      ? `/c/${capsule_id}#comments`
      : `/c/${capsule_id}`;
  }

  return '/notifications';
}

function resolveGroupPushUrl(
  group: DigestGroup,
  actorUsernames: Map<string, string>,
): string {
  return resolvePushDigestUrl({
    type: group.type,
    capsule_id: group.capsule_id,
    collection_id: group.collection_id,
    actorIds: group.actorNames,
    actorUsernames,
  });
}

/**
 * Construye título/cuerpo/url del push digest.
 * Una alerta → mismo formato que el push instantáneo anterior.
 * Varios grupos → resumen compacto con desglose por tipo.
 */
export function buildPushDigestPayload(params: {
  notifications: PendingNotificationRow[];
  actorNames: Map<string, string>;
  actorUsernames: Map<string, string>;
  matchLabels: Map<string, string>;
}): { title: string; body: string; url: string } | null {
  const { notifications, actorNames, actorUsernames, matchLabels } = params;
  if (notifications.length === 0) return null;

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (sorted.length === 1) {
    const n = sorted[0]!;
    const name = resolveActorName(n.actor_id, actorNames);
    const matchLabel = n.capsule_id
      ? matchLabels.get(n.capsule_id) ?? null
      : n.collection_id
        ? matchLabels.get(n.collection_id) ?? null
        : null;
    const snippet =
      n.type === 'comment' || n.type === 'mention' ? n.body?.trim() || null : null;
    const onCollection = Boolean(n.collection_id && !n.capsule_id);
    return {
      title: PUSH_TITLE[n.type],
      body: buildNotificationPushBody({
        type: n.type,
        actorName: name,
        matchLabel,
        commentSnippet: snippet,
        onCollection,
      }),
      url: resolvePushDigestUrl({
        type: n.type,
        capsule_id: n.capsule_id,
        collection_id: n.collection_id ?? null,
        actorIds: [n.actor_id],
        actorUsernames,
      }),
    };
  }

  const groups = groupNotificationsForDigest(sorted);

  if (groups.length === 1) {
    const group = groups[0]!;
    const names = group.actorNames.map((id) => resolveActorName(id, actorNames));
    const actorsText = formatDigestActorNames(names);
    const onCollection = Boolean(group.collection_id && !group.capsule_id);
    const action = digestActionText(group.type, names.length, onCollection);
    const matchLabel = group.capsule_id
      ? matchLabels.get(group.capsule_id) ?? null
      : group.collection_id
        ? matchLabels.get(group.collection_id) ?? null
        : null;

    let body: string;
    if (group.type === 'follow') {
      body = `${actorsText} ${action}`;
    } else if (matchLabel) {
      body = `${actorsText} ${action} (${matchLabel})`;
    } else {
      body = `${actorsText} ${action}`;
    }

    return {
      title: PUSH_TITLE[group.type],
      body,
      url: resolveGroupPushUrl(group, actorUsernames),
    };
  }

  const total = sorted.length;
  const breakdown = formatTypeBreakdown(countByType(sorted));
  return {
    title: 'Ninety',
    body: `${total} alertas nuevas${breakdown ? `: ${breakdown}` : ''}`,
    url: '/notifications',
  };
}

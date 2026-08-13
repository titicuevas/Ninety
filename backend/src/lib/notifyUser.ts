import { supabaseAdmin } from './supabase.js';
import { isActorMuted } from './notificationMutes.js';
import {
  getNotificationPreferences,
  isNotificationTypeEnabled,
  type NotificationType,
} from './notificationPreferencesStore.js';
import { getBlockRelation, isBlockActive } from './userBlocks.js';
const BODY_MAX = 120;

function truncateBody(raw: string | undefined): string | null {
  const text = raw?.trim();
  if (!text) return null;
  if (text.length <= BODY_MAX) return text;
  return `${text.slice(0, BODY_MAX - 1).trimEnd()}…`;
}

function isMissingBodyColumn(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('body') &&
    (message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist'))
  );
}

export async function notifyUser(params: {
  userId: string;
  actorId: string;
  type: NotificationType;
  capsuleId?: string;
  collectionId?: string;
  /** Snapshot del comentario (type=comment | mention). */
  body?: string;
}) {
  if (params.userId === params.actorId) return;

  try {
    if (!supabaseAdmin) return;

    const prefs = await getNotificationPreferences(params.userId);
    if (!isNotificationTypeEnabled(prefs, params.type)) return;

    if (await isActorMuted(params.userId, params.actorId)) return;

    const block = await getBlockRelation(params.userId, params.actorId);
    if (isBlockActive(block)) return;

    const snippet =
      params.type === 'comment' || params.type === 'mention'
        ? truncateBody(params.body)
        : null;
    const row: Record<string, unknown> = {
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      capsule_id: params.capsuleId ?? null,
      collection_id: params.collectionId ?? null,
    };
    if (snippet) row.body = snippet;

    let { error } = await supabaseAdmin.from('notifications').insert(row);

    if (error && snippet && isMissingBodyColumn(error)) {
      delete row.body;
      ({ error } = await supabaseAdmin.from('notifications').insert(row));
    }

    // Si la migración de collection_id aún no está, reintenta sin la columna.
    if (
      error &&
      params.collectionId &&
      ((error.message ?? '').includes('collection_id') ||
        (error.message ?? '').includes('collection_like'))
    ) {
      return;
    }

    if (error) return;

    // In-app siempre; push vía digest periódico (flushPushDigests / cron).
  } catch {
    // Non-critical — don't break the main flow
  }
}

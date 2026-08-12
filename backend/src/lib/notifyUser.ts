import { supabaseAdmin } from './supabase.js';
import { isActorMuted } from './notificationMutes.js';
import {
  getNotificationPreferences,
  isNotificationTypeEnabled,
  type NotificationType,
} from './notificationPreferencesStore.js';
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
  /** Snapshot del comentario (solo type=comment). */
  body?: string;
}) {
  if (params.userId === params.actorId) return;

  try {
    if (!supabaseAdmin) return;

    const prefs = await getNotificationPreferences(params.userId);
    if (!isNotificationTypeEnabled(prefs, params.type)) return;

    if (await isActorMuted(params.userId, params.actorId)) return;

    const snippet = params.type === 'comment' ? truncateBody(params.body) : null;
    const row: Record<string, unknown> = {
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      capsule_id: params.capsuleId ?? null,
    };
    if (snippet) row.body = snippet;

    let { error } = await supabaseAdmin.from('notifications').insert(row);

    if (error && snippet && isMissingBodyColumn(error)) {
      delete row.body;
      ({ error } = await supabaseAdmin.from('notifications').insert(row));
    }

    if (error) return;

    // In-app siempre; push vía digest periódico (flushPushDigests / cron).
  } catch {
    // Non-critical — don't break the main flow
  }
}

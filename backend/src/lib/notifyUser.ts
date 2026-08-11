import { supabaseAdmin } from './supabase.js';
import {
  buildNotificationPushBody,
  formatMatchLabel,
  mapNotificationCapsule,
  type CapsuleNotificationRow,
} from './notificationCapsule.js';
import { isActorMuted } from './notificationMutes.js';
import {
  getNotificationPreferences,
  isNotificationTypeEnabled,
  type NotificationType,
} from './notificationPreferencesStore.js';
import { isWithinPushQuietHours } from './notificationQuietHours.js';
import { sendPushToUser } from './webPush.js';

const BODY_MAX = 120;

const PUSH_TITLE: Record<NotificationType, string> = {
  like: 'Nuevo like',
  follow: 'Nuevo seguidor',
  comment: 'Nuevo comentario',
};

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

    const [actorResult, capsuleResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('username, full_name')
        .eq('id', params.actorId)
        .maybeSingle(),
      params.capsuleId
        ? supabaseAdmin
            .from('capsules')
            .select('id, home_team_name, away_team_name, competition_name, photo_urls')
            .eq('id', params.capsuleId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const actor = actorResult.data;
    const name = actor?.full_name || (actor?.username ? `@${actor.username}` : 'Alguien');
    const capsule = mapNotificationCapsule(
      (capsuleResult.data as CapsuleNotificationRow | null) ?? null,
    );
    const matchLabel = capsule ? formatMatchLabel(capsule) : null;

    const url =
      params.type === 'follow' && actor?.username
        ? `/u/${actor.username}`
        : params.capsuleId
          ? params.type === 'comment'
            ? `/c/${params.capsuleId}#comments`
            : `/c/${params.capsuleId}`
          : '/notifications';

    // In-app siempre; push solo fuera del horario silencioso (timezone del dispositivo).
    if (!isWithinPushQuietHours(prefs.push_quiet)) {
      void sendPushToUser(params.userId, {
        title: PUSH_TITLE[params.type],
        body: buildNotificationPushBody({
          type: params.type,
          actorName: name,
          matchLabel,
          commentSnippet: snippet,
        }),
        url,
      });
    }
  } catch {
    // Non-critical — don't break the main flow
  }
}

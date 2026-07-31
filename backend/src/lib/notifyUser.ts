import { supabaseAdmin } from './supabase.js';
import { sendPushToUser } from './webPush.js';

type NotificationType = 'like' | 'follow' | 'comment';

const BODY_MAX = 120;

const PUSH_COPY: Record<NotificationType, { title: string; body: (name: string, snippet?: string) => string }> = {
  like: {
    title: 'Nuevo like',
    body: (name) => `A ${name} le gustó tu cápsula`,
  },
  follow: {
    title: 'Nuevo seguidor',
    body: (name) => `${name} te empezó a seguir`,
  },
  comment: {
    title: 'Nuevo comentario',
    body: (name, snippet) =>
      snippet ? `${name}: «${snippet}»` : `${name} comentó en tu cápsula`,
  },
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

    const { data: actor } = await supabaseAdmin
      .from('profiles')
      .select('username, full_name')
      .eq('id', params.actorId)
      .maybeSingle();

    const name = actor?.full_name || (actor?.username ? `@${actor.username}` : 'Alguien');
    const copy = PUSH_COPY[params.type];
    const url =
      params.type === 'follow' && actor?.username
        ? `/u/${actor.username}`
        : params.capsuleId
          ? params.type === 'comment'
            ? `/c/${params.capsuleId}#comments`
            : `/c/${params.capsuleId}`
          : '/notifications';

    void sendPushToUser(params.userId, {
      title: copy.title,
      body: copy.body(name, snippet ?? undefined),
      url,
    });
  } catch {
    // Non-critical — don't break the main flow
  }
}

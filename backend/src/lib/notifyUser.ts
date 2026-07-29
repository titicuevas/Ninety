import { supabaseAdmin } from './supabase.js';
import { sendPushToUser } from './webPush.js';

type NotificationType = 'like' | 'follow' | 'comment';

const PUSH_COPY: Record<NotificationType, { title: string; body: (name: string) => string }> = {
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
    body: (name) => `${name} comentó en tu cápsula`,
  },
};

export async function notifyUser(params: {
  userId: string;
  actorId: string;
  type: NotificationType;
  capsuleId?: string;
}) {
  if (params.userId === params.actorId) return;

  try {
    if (!supabaseAdmin) return;

    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      capsule_id: params.capsuleId ?? null,
    });

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
          ? `/c/${params.capsuleId}`
          : '/notifications';

    void sendPushToUser(params.userId, {
      title: copy.title,
      body: copy.body(name),
      url,
    });
  } catch {
    // Non-critical — don't break the main flow
  }
}

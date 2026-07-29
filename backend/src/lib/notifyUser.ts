import { supabaseAdmin } from './supabase.js';

type NotificationType = 'like' | 'follow' | 'comment';

export async function notifyUser(params: {
  userId: string;
  actorId: string;
  type: NotificationType;
  capsuleId?: string;
}) {
  if (params.userId === params.actorId) return;

  try {
    await supabaseAdmin!.from('notifications').insert({
      user_id: params.userId,
      actor_id: params.actorId,
      type: params.type,
      capsule_id: params.capsuleId ?? null,
    });
  } catch {
    // Non-critical — don't break the main flow
  }
}

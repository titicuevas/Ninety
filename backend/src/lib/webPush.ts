import webpush from 'web-push';
import { env } from '../config/loadEnv.js';
import { supabaseAdmin } from './supabase.js';

export function isPushConfigured(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

function ensureWebPushConfigured() {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  return true;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<{ sent: number; skipped: number }> {
  if (!ensureWebPushConfigured() || !supabaseAdmin) return { sent: 0, skipped: 0 };

  const { data: rows } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!rows?.length) return { sent: 0, skipped: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let skipped = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
        );
        sent += 1;
      } catch (err: unknown) {
        skipped += 1;
        const status = err && typeof err === 'object' && 'statusCode' in err ? Number(err.statusCode) : 0;
        // 404/410 = subscription expired
        if (status === 404 || status === 410) {
          await supabaseAdmin!.from('push_subscriptions').delete().eq('id', row.id);
        }
      }
    }),
  );

  return { sent, skipped };
}

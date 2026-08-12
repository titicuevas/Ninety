import {
  buildEmailDigestContent,
  isLocalMonday,
  type EmailDigestCapsule,
} from './emailDigestBuild.js';
import { renderEmailDigestMail } from './emailDigestTemplate.js';
import {
  buildEmailDigestUnsubscribeUrl,
  isEmailUnsubscribeConfigured,
} from './emailDigestUnsubscribe.js';
import { getNotificationPreferences } from './notificationPreferencesStore.js';
import { isResendConfigured, sendResendEmail } from './resendEmail.js';
import { supabaseAdmin } from './supabase.js';
import { env } from '../config/loadEnv.js';

export type FlushEmailDigestsResult = {
  users: number;
  sent: number;
  skipped: number;
};

function isMissingEmailDigest(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('diary_email_digest_sent') ||
    message.includes('email_digest_enabled') ||
    ((message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist')) &&
      message.includes('email_digest'))
  );
}

function publicApiBaseUrl(): string {
  // En prod el API suele estar en otro host; el enlace de baja apunta al API.
  // Si hay PUBLIC_API_URL úsalo; si no, CLIENT_URL + path relativo no sirve para /api.
  const explicit = process.env.PUBLIC_API_URL?.trim() || process.env.API_PUBLIC_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  // Fallback local / mismo origen raro: CLIENT_URL no tiene /api — usamos env PORT heurística en dev.
  if (env.NODE_ENV !== 'production') {
    return `http://localhost:${env.PORT}`;
  }
  // Prod: asumir reverse proxy mismo dominio bajo www o API dedicado vía PUBLIC_API_URL.
  return env.CLIENT_URL.replace(/\/$/, '');
}

async function loadUserCapsules(userId: string): Promise<EmailDigestCapsule[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('capsules')
    .select('id, watched_at, home_team_name, away_team_name, rating')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as EmailDigestCapsule[];
}

async function loadUserEmail(userId: string): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

async function tryClaimWeek(userId: string, weekKey: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { error } = await supabaseAdmin.from('diary_email_digest_sent').insert({
    user_id: userId,
    week_key: weekKey,
    sent_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === '23505') return false;
    if (isMissingEmailDigest(error)) return false;
    throw error;
  }
  return true;
}

async function releaseWeekClaim(userId: string, weekKey: string): Promise<void> {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin
    .from('diary_email_digest_sent')
    .delete()
    .eq('user_id', userId)
    .eq('week_key', weekKey);
  if (error && !isMissingEmailDigest(error)) throw error;
}

async function flushUserEmailDigest(
  userId: string,
  now: Date,
): Promise<'sent' | 'skipped'> {
  if (!supabaseAdmin) return 'skipped';

  const prefs = await getNotificationPreferences(userId);
  if (!prefs.email_digest) return 'skipped';

  const timezone = prefs.push_quiet.timezone || 'UTC';
  if (!isLocalMonday(now, timezone)) return 'skipped';

  if (!isResendConfigured() || !isEmailUnsubscribeConfigured()) return 'skipped';

  const email = await loadUserEmail(userId);
  if (!email) return 'skipped';

  const capsules = await loadUserCapsules(userId);
  const content = buildEmailDigestContent(capsules, { now, timeZone: timezone });

  const claimed = await tryClaimWeek(userId, content.weekKey);
  if (!claimed) return 'skipped';

  const apiBase = publicApiBaseUrl();
  const unsubscribeUrl = buildEmailDigestUnsubscribeUrl(userId, apiBase);
  if (!unsubscribeUrl) {
    await releaseWeekClaim(userId, content.weekKey);
    return 'skipped';
  }

  const settingsUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/settings`;
  const mail = renderEmailDigestMail(content, {
    clientUrl: env.CLIENT_URL,
    settingsUrl,
    unsubscribeUrl,
  });

  const result = await sendResendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    idempotencyKey: `email-digest:${userId}:${content.weekKey}`,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  if (!result.ok) {
    await releaseWeekClaim(userId, content.weekKey);
    return 'skipped';
  }

  return 'sent';
}

/**
 * Cron: digest email semanal del diario (opt-in; solo lunes en TZ del usuario; 1/semana).
 * No mezcla con el digest push social.
 */
export async function flushEmailDigests(options?: {
  now?: Date;
}): Promise<FlushEmailDigestsResult> {
  if (!supabaseAdmin) {
    return { users: 0, sent: 0, skipped: 0 };
  }

  const now = options?.now ?? new Date();

  const { data: prefRows, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('user_id')
    .eq('email_digest_enabled', true);

  if (error) {
    if (isMissingEmailDigest(error)) {
      return { users: 0, sent: 0, skipped: 0 };
    }
    throw error;
  }

  const userIds = [...new Set((prefRows ?? []).map((r) => r.user_id as string))];
  let sent = 0;
  let skipped = 0;

  for (const userId of userIds) {
    const result = await flushUserEmailDigest(userId, now);
    if (result === 'sent') sent += 1;
    else skipped += 1;
  }

  return { users: userIds.length, sent, skipped };
}

export async function disableEmailDigestForUser(userId: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
  try {
    const { upsertNotificationPreferences } = await import('./notificationPreferencesStore.js');
    await upsertNotificationPreferences(userId, { email_digest: false });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('email_digest') || message.includes('20250818120000')) return false;
    throw err;
  }
}

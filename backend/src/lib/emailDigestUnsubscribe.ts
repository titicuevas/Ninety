import { createHmac, timingSafeEqual } from 'node:crypto';

function unsubscribeSigningSecret(): string | null {
  const dedicated = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim();
  if (dedicated) return dedicated;
  const cron = process.env.CRON_SECRET?.trim();
  if (cron) return cron;
  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();
  if (service) return service;
  return null;
}

export function isEmailUnsubscribeConfigured(): boolean {
  return Boolean(unsubscribeSigningSecret());
}

export function signEmailDigestUnsubscribe(userId: string): string | null {
  const secret = unsubscribeSigningSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(`email-digest:${userId}`).digest('hex').slice(0, 32);
}

export function verifyEmailDigestUnsubscribe(userId: string, signature: string): boolean {
  const expected = signEmailDigestUnsubscribe(userId);
  if (!expected || !signature || signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function buildEmailDigestUnsubscribeUrl(userId: string, apiBaseUrl: string): string | null {
  const sig = signEmailDigestUnsubscribe(userId);
  if (!sig) return null;
  const base = apiBaseUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ u: userId, sig });
  return `${base}/api/email-digest/unsubscribe?${params.toString()}`;
}

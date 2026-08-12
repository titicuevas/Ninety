import { env } from '../config/loadEnv.js';

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Clave de idempotencia Resend (hasta 256 chars). */
  idempotencyKey?: string;
  headers?: Record<string, string>;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'not_configured' | 'request_failed'; error?: string };

const DEFAULT_FROM = 'Ninety <noreply@getninety.app>';

export function isResendConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY?.trim());
}

export function emailDigestFromAddress(): string {
  const from = env.EMAIL_DIGEST_FROM?.trim();
  return from || DEFAULT_FROM;
}

/** Envío vía API Resend (mismo dominio que auth SMTP). */
export async function sendResendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: 'not_configured' };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey.slice(0, 256);
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: emailDigestFromAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        headers: params.headers,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        ok: false,
        reason: 'request_failed',
        error: body.slice(0, 300) || `HTTP ${response.status}`,
      };
    }

    const json = (await response.json()) as { id?: string };
    return { ok: true, id: typeof json.id === 'string' ? json.id : 'ok' };
  } catch (err) {
    return {
      ok: false,
      reason: 'request_failed',
      error: err instanceof Error ? err.message : 'fetch failed',
    };
  }
}

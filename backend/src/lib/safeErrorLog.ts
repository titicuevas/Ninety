const REDACTIONS: Array<[RegExp, string]> = [
  [/\bsb_secret_[A-Za-z0-9_-]+\b/gi, '[REDACTED_SUPABASE_KEY]'],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]'],
  [/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]'],
  [/\b(?:SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|FOOTBALL_DATA_API_KEY|TEST_USER_PASSWORD|VAPID_PRIVATE_KEY|CRON_SECRET)\b\s*[:=]\s*[^\s,;]+/gi, '[REDACTED_SECRET_ASSIGNMENT]'],
  [/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, '[REDACTED_PRIVATE_KEY]'],
];

export function sanitizeLogText(value: unknown): string {
  let text = String(value ?? 'Error desconocido');
  for (const [pattern, replacement] of REDACTIONS) text = text.replace(pattern, replacement);
  return text.slice(0, 1_000);
}

function safeScalar(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length <= 100) return sanitizeLogText(value);
  return undefined;
}

export function safeErrorLog(error: unknown): Record<string, string | number> {
  if (error instanceof Error) {
    const record = error as Error & { code?: unknown; status?: unknown };
    const code = safeScalar(record.code);
    const status = safeScalar(record.status);
    return {
      name: sanitizeLogText(error.name),
      message: sanitizeLogText(error.message),
      ...(code !== undefined ? { code } : {}),
      ...(status !== undefined ? { status } : {}),
    };
  }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const code = safeScalar(record.code);
    const status = safeScalar(record.status);
    return {
      name: 'NonError',
      message: sanitizeLogText(record.message ?? 'Error desconocido'),
      ...(code !== undefined ? { code } : {}),
      ...(status !== undefined ? { status } : {}),
    };
  }
  return { name: 'NonError', message: sanitizeLogText(error) };
}

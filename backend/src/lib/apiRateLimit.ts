import type { Request } from 'express';
import rateLimit from 'express-rate-limit';

export const API_RATE_LIMIT_WINDOW_MS = 60_000;
/** Techo por IP en producción: una Home dispara varias queries, no un flood. */
export const API_RATE_LIMIT_MAX_PRODUCTION = 180;
/** Local / test / e2e: suites largas no deben chocar con el techo. */
export const API_RATE_LIMIT_MAX_RELAXED = 5_000;

export function apiRateLimitMax(nodeEnv: string | undefined): number {
  return nodeEnv === 'production' ? API_RATE_LIMIT_MAX_PRODUCTION : API_RATE_LIMIT_MAX_RELAXED;
}

/** Health y cron no cuentan: probes de Railway y jobs internos. */
export function shouldSkipApiRateLimit(path: string): boolean {
  const normalized = (path.split('?')[0] ?? '/').replace(/\/+$/, '') || '/';
  return (
    normalized === '/health' ||
    normalized === '/api/health' ||
    normalized.startsWith('/internal') ||
    normalized.startsWith('/api/internal')
  );
}

export function createApiRateLimiter(options?: { max?: number; windowMs?: number }) {
  return rateLimit({
    windowMs: options?.windowMs ?? API_RATE_LIMIT_WINDOW_MS,
    max: options?.max ?? apiRateLimitMax(process.env.NODE_ENV),
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => shouldSkipApiRateLimit(req.path),
    message: { error: 'Demasiadas peticiones. Inténtalo en un minuto.' },
  });
}

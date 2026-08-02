/** Destino por defecto tras login/registro. */
export const DEFAULT_POST_AUTH_PATH = '/home';

const AUTH_RETURN_KEY = 'ninety.authReturn:v1';
const MAX_RETURN_LENGTH = 2048;

const BLOCKED_EXACT = new Set(['/login', '/register', '/forgot-password', '/auth/callback', '/auth/reset-password']);

/**
 * Valida un path relativo interno para return-to post-auth.
 * Rechaza open redirects (`//…`, esquemas, backslash) y rutas de auth.
 */
export function resolveReturnPath(candidate: string | null | undefined): string | null {
  if (candidate == null) return null;

  const raw = candidate.trim();
  if (!raw || raw.length > MAX_RETURN_LENGTH) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (raw.includes('\\') || raw.includes('\0')) return null;

  const pathname = raw.split(/[?#]/, 1)[0] ?? raw;
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return null;
  if (BLOCKED_EXACT.has(pathname)) return null;
  if (pathname === '/auth' || pathname.startsWith('/auth/')) return null;

  return raw;
}

export function safeReturnPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_POST_AUTH_PATH,
): string {
  return resolveReturnPath(candidate) ?? fallback;
}

/** Lee `?next=` ya decodificado por URLSearchParams. */
export function parseNextParam(search: string | URLSearchParams): string | null {
  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  return resolveReturnPath(params.get('next'));
}

export function loginPath(returnTo?: string | null): string {
  const next = resolveReturnPath(returnTo);
  if (!next) return '/login';
  return `/login?next=${encodeURIComponent(next)}`;
}

export function registerPath(returnTo?: string | null): string {
  const next = resolveReturnPath(returnTo);
  if (!next) return '/register';
  return `/register?next=${encodeURIComponent(next)}`;
}

/** Path actual (pathname + search + hash) para CTAs de invitado. */
export function locationReturnPath(location: {
  pathname: string;
  search?: string;
  hash?: string;
}): string {
  return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`;
}

/** Persiste el destino para el round-trip de Google OAuth (junto al PKCE). */
export function saveAuthReturnPath(returnTo: string | null | undefined): void {
  const next = resolveReturnPath(returnTo);
  if (!next) {
    sessionStorage.removeItem(AUTH_RETURN_KEY);
    return;
  }
  sessionStorage.setItem(AUTH_RETURN_KEY, next);
}

export function peekAuthReturnPath(): string | null {
  try {
    return resolveReturnPath(sessionStorage.getItem(AUTH_RETURN_KEY));
  } catch {
    return null;
  }
}

export function consumeAuthReturnPath(fallback: string = DEFAULT_POST_AUTH_PATH): string {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(AUTH_RETURN_KEY);
    sessionStorage.removeItem(AUTH_RETURN_KEY);
  } catch {
    raw = null;
  }
  return safeReturnPath(raw, fallback);
}

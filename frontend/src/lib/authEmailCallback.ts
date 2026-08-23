export type AuthEmailCallbackResult =
  | { kind: 'error'; message: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string; type: string | null }
  | { kind: 'token_hash'; tokenHash: string; type: AuthEmailOtpType }
  | { kind: 'code'; code: string }
  | { kind: 'empty' };

type AuthEmailOtpType =
  | 'signup'
  | 'email'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email_change';

const OTP_TYPES = new Set<string>([
  'signup',
  'email',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
]);

function decodeParam(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function isOtpType(value: string): value is AuthEmailOtpType {
  return OTP_TYPES.has(value);
}

/**
 * Interpreta el retorno de confirmación de email / OAuth de Supabase
 * (hash implícito, token_hash o ?code=).
 */
export function parseAuthEmailCallback(search: string, hash: string): AuthEmailCallbackResult {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(search.replace(/^\?/, ''));

  const error =
    queryParams.get('error_description') ??
    queryParams.get('error') ??
    hashParams.get('error_description') ??
    hashParams.get('error');

  if (error) {
    return { kind: 'error', message: decodeParam(error) };
  }

  const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');
  const type = hashParams.get('type') ?? queryParams.get('type');

  if (accessToken && refreshToken) {
    return {
      kind: 'tokens',
      accessToken,
      refreshToken,
      type,
    };
  }

  const tokenHash = queryParams.get('token_hash') ?? hashParams.get('token_hash');
  if (tokenHash && type && isOtpType(type)) {
    return { kind: 'token_hash', tokenHash, type };
  }

  const code = queryParams.get('code');
  if (code) {
    return { kind: 'code', code };
  }

  return { kind: 'empty' };
}

/** True si la URL parece un retorno de Auth (para redirigir desde la landing). */
export function looksLikeAuthCallback(search: string, hash: string): boolean {
  const result = parseAuthEmailCallback(search, hash);
  return result.kind !== 'empty';
}

/** Limpia tokens sensibles de la barra de direcciones. */
export function clearAuthCallbackUrl() {
  window.history.replaceState(null, '', window.location.pathname);
}

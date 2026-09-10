export type RecoveryParseResult =
  | { ok: true; kind: 'access_token'; accessToken: string }
  | { ok: true; kind: 'token_hash'; tokenHash: string }
  | { ok: false; error: string };

function decodeParam(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/** Traduce errores típicos del proveedor a copy claro en español. */
export function friendlyRecoveryError(raw: string): string {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (/otp_expired|link expired|expired|expirado/.test(lower)) {
    return 'El enlace ha caducado. Solicita uno nuevo desde “¿Olvidaste tu contraseña?”.';
  }
  if (/access_denied|invalid|inválido|otp_disabled/.test(lower)) {
    return 'Enlace inválido o ya usado. Solicita uno nuevo desde “¿Olvidaste tu contraseña?”.';
  }
  return text;
}

/**
 * Lee el token de recovery de Supabase desde hash (#) o query (?).
 * Soporta access_token (flujo implícito) y token_hash (plantillas PKCE).
 */
export function parseRecoveryParams(search: string, hash: string): RecoveryParseResult {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(search.replace(/^\?/, ''));

  const error =
    queryParams.get('error_description') ??
    queryParams.get('error') ??
    hashParams.get('error_description') ??
    hashParams.get('error');

  if (error) {
    return {
      ok: false,
      error: friendlyRecoveryError(decodeParam(error)),
    };
  }

  const type = hashParams.get('type') ?? queryParams.get('type');
  const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
  const tokenHash = queryParams.get('token_hash') ?? hashParams.get('token_hash');

  if (accessToken) {
    if (type && type !== 'recovery') {
      return {
        ok: false,
        error: 'Este enlace no es de recuperación de contraseña. Solicita uno nuevo.',
      };
    }
    return { ok: true, kind: 'access_token', accessToken };
  }

  if (tokenHash) {
    if (type && type !== 'recovery') {
      return {
        ok: false,
        error: 'Este enlace no es de recuperación de contraseña. Solicita uno nuevo.',
      };
    }
    return { ok: true, kind: 'token_hash', tokenHash };
  }

  return {
    ok: false,
    error: 'Enlace inválido o caducado. Solicita uno nuevo desde “¿Olvidaste tu contraseña?”.',
  };
}

/** Quita hash y query del recovery para no dejar el token en la barra de direcciones. */
export function clearRecoveryUrl() {
  window.history.replaceState(null, '', window.location.pathname);
}

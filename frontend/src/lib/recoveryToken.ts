export type RecoveryParseResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: string };

function decodeParam(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/**
 * Lee el token de recovery de Supabase desde hash (#) o query (?).
 * También detecta errores del proveedor en la URL.
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
      error: decodeParam(error),
    };
  }

  const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
  const type = hashParams.get('type') ?? queryParams.get('type');

  if (!accessToken) {
    return {
      ok: false,
      error: 'Enlace inválido o caducado. Solicita uno nuevo desde “¿Olvidaste tu contraseña?”.',
    };
  }

  if (type && type !== 'recovery') {
    return {
      ok: false,
      error: 'Este enlace no es de recuperación de contraseña. Solicita uno nuevo.',
    };
  }

  return { ok: true, accessToken };
}

/** Quita hash y query del recovery para no dejar el token en la barra de direcciones. */
export function clearRecoveryUrl() {
  window.history.replaceState(null, '', window.location.pathname);
}

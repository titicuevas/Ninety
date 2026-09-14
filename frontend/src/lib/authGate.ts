import { locationReturnPath, loginPath, registerPath } from '@/lib/authReturn';

/** Destino de auth para acciones que requieren cuenta (guardar, seguir, like…). */
export function authRequiredPath(
  location: { pathname: string; search?: string; hash?: string },
  prefer: 'register' | 'login' = 'register',
): string {
  const next = locationReturnPath(location);
  return prefer === 'register' ? registerPath(next) : loginPath(next);
}

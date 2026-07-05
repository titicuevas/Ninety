import { apiFetch } from '@/lib/api';
import { clearSession, consumePkceId, saveSession } from '@/lib/session';
import type { AuthSession } from '@/types/auth';

interface AuthResponse {
  session: AuthSession;
}

export async function loginWithPassword(email: string, password: string) {
  const { session } = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveSession(session);
  return session;
}

export async function registerWithPassword(email: string, password: string, display_name: string) {
  const data = await apiFetch<AuthResponse & { message?: string; session: AuthSession | null }>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name }),
    },
  );

  if (data.session) {
    saveSession(data.session);
  }

  return data;
}

export async function completeOAuthCallback(code: string) {
  const pkceId = consumePkceId();
  if (!pkceId) {
    throw new Error('La sesión OAuth expiró. Inténtalo de nuevo.');
  }

  const { session } = await apiFetch<AuthResponse>('/api/auth/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code, pkceId }),
  });
  saveSession(session);
  return session;
}

export async function validateSession(accessToken: string) {
  return apiFetch<{ user: AuthSession['user'] }>(
    '/api/auth/session',
    {},
    accessToken,
  );
}

export async function signOut(accessToken?: string | null) {
  if (accessToken) {
    await apiFetch('/api/auth/logout', { method: 'POST' }, accessToken).catch(() => undefined);
  }
  clearSession();
}

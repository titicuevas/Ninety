import { useEffect } from 'react';
import { refreshSession, validateSession } from '@/lib/auth';
import { clearSession, loadSession, saveSession } from '@/lib/session';
import { useAuthStore } from '@/stores/authStore';
import type { AuthSession } from '@/types/auth';

const REFRESH_MARGIN_SEC = 120;

function isAccessTokenExpired(session: AuthSession, marginSec = REFRESH_MARGIN_SEC) {
  if (!session.expires_at) return false;
  return session.expires_at * 1000 <= Date.now() + marginSec * 1000;
}

async function restoreSession(stored: AuthSession): Promise<AuthSession | null> {
  if (!isAccessTokenExpired(stored)) {
    try {
      await validateSession(stored.access_token);
      return stored;
    } catch {
      /* intentar refresh abajo */
    }
  }

  if (!stored.refresh_token) return null;

  try {
    return await refreshSession(stored.refresh_token);
  } catch {
    return null;
  }
}

/** Solo en rutas que necesitan sesión — no bloquea la landing pública. */
export function useAuthInit() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    let active = true;
    let refreshTimer: number | undefined;

    async function bootstrap() {
      setLoading(true);
      const stored = loadSession();

      if (!stored) {
        if (active) setLoading(false);
        return;
      }

      const timeout = window.setTimeout(() => {
        if (active) setLoading(false);
      }, 4000);

      try {
        const session = await restoreSession(stored);
        if (!active) return;

        if (!session) {
          clearSession();
          setSession(null);
          return;
        }

        saveSession(session);
        setSession(session);

        if (session.expires_at) {
          const delayMs = Math.max(5_000, session.expires_at * 1000 - Date.now() - REFRESH_MARGIN_SEC * 1000);
          refreshTimer = window.setTimeout(() => {
            void refreshSession(session.refresh_token)
              .then((next) => {
                if (active) setSession(next);
              })
              .catch(() => {
                clearSession();
                if (active) setSession(null);
              });
          }, delayMs);
        }
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, [setSession, setLoading]);
}

export function useAuth() {
  return useAuthStore();
}

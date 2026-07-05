import { useEffect } from 'react';
import { validateSession } from '@/lib/auth';
import { clearSession, loadSession } from '@/lib/session';
import { useAuthStore } from '@/stores/authStore';

/** Solo en rutas que necesitan sesión — no bloquea la landing pública. */
export function useAuthInit() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    let active = true;

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
        await validateSession(stored.access_token);
        if (active) setSession(stored);
      } catch {
        clearSession();
        if (active) setSession(null);
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [setSession, setLoading]);
}

export function useAuth() {
  return useAuthStore();
}

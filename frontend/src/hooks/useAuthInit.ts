import { useEffect } from 'react';
import { validateSession } from '@/lib/auth';
import { clearSession, loadSession } from '@/lib/session';
import { useAuthStore } from '@/stores/authStore';

export function useAuthInit() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const stored = loadSession();
      if (!stored) {
        if (active) setLoading(false);
        return;
      }

      try {
        await validateSession(stored.access_token);
        if (active) setSession(stored);
      } catch {
        clearSession();
        if (active) setSession(null);
      } finally {
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

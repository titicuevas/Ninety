import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { completeOAuthCallback } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const authError = params.get('error_description') ?? params.get('error');

      if (authError) {
        if (active) setError(authError);
        return;
      }

      const code = params.get('code');
      if (!code) {
        if (active) setError('No se pudo completar el inicio de sesión. Inténtalo de nuevo.');
        return;
      }

      try {
        const session = await completeOAuthCallback(code);
        if (!active) return;
        setSession(session);
        navigate('/home', { replace: true });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudo completar el inicio de sesión.');
      }
    }

    void handleCallback();

    return () => {
      active = false;
    };
  }, [navigate, setSession]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Link to="/login" className="text-sm text-primary hover:underline">
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  completeOAuthCallback,
  establishSessionFromTokens,
  verifyEmailTokenHash,
} from '@/lib/auth';
import {
  clearAuthCallbackUrl,
  parseAuthEmailCallback,
} from '@/lib/authEmailCallback';
import {
  consumeAuthReturnPath,
  DEFAULT_POST_AUTH_PATH,
  loginPath,
  peekAuthReturnPath,
} from '@/lib/authReturn';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuthStore } from '@/stores/authStore';

export function AuthCallbackPage() {
  useDocumentTitle('Autenticando');
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function handleCallback() {
      const parsed = parseAuthEmailCallback(window.location.search, window.location.hash);

      if (parsed.kind === 'error') {
        clearAuthCallbackUrl();
        if (active) setError(parsed.message);
        return;
      }

      try {
        if (parsed.kind === 'tokens') {
          clearAuthCallbackUrl();
          if (parsed.type === 'recovery') {
            if (active) {
              setError(
                'Este enlace es de recuperación de contraseña. Usa el enlace del email de restablecer contraseña.',
              );
            }
            return;
          }
          const session = await establishSessionFromTokens(parsed.accessToken, parsed.refreshToken);
          if (!active) return;
          setSession(session);
          const isEmailConfirm =
            parsed.type === 'signup' || parsed.type === 'email' || parsed.type === null;
          navigate(DEFAULT_POST_AUTH_PATH, {
            replace: true,
            state: isEmailConfirm
              ? { emailConfirmed: true, fromRegister: true }
              : undefined,
          });
          return;
        }

        if (parsed.kind === 'token_hash') {
          clearAuthCallbackUrl();
          if (parsed.type === 'recovery') {
            navigate(`/auth/reset-password?token_hash=${encodeURIComponent(parsed.tokenHash)}&type=recovery`, {
              replace: true,
            });
            return;
          }
          const session = await verifyEmailTokenHash(parsed.tokenHash, parsed.type);
          if (!active) return;
          setSession(session);
          navigate(DEFAULT_POST_AUTH_PATH, {
            replace: true,
            state: { emailConfirmed: true, fromRegister: true },
          });
          return;
        }

        if (parsed.kind === 'code') {
          clearAuthCallbackUrl();
          const session = await completeOAuthCallback(parsed.code);
          if (!active) return;
          setSession(session);
          navigate(consumeAuthReturnPath(), { replace: true });
          return;
        }

        if (active) {
          setError('No se pudo completar el inicio de sesión. Inténtalo de nuevo.');
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'No se pudo completar el inicio de sesión.';
        // Confirmación sin PKCE local: pedir login en vez de parecer un fallo opaco
        if (parsed.kind === 'code' && /OAuth expiró|pkce/i.test(message)) {
          navigate(loginPath(), {
            replace: true,
            state: { emailConfirmed: true },
          });
          return;
        }
        setError(message);
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
        <Link to={loginPath(peekAuthReturnPath())} className="text-sm text-primary hover:underline">
          Ir al login
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

import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { apiFetch } from '@/lib/api';
import {
  loginPath,
  registerPath,
  safeReturnPath,
} from '@/lib/authReturn';
import {
  normalizeInviteCode,
  saveInviteCode,
} from '@/lib/inviteReferral';
import { profilePath } from '@/lib/profilePath';

type InvitePreview = {
  code: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function InvitePage() {
  const { code: codeParam } = useParams<{ code: string }>();
  const code = normalizeInviteCode(codeParam);
  const { user, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(Boolean(code));
  const [notFound, setNotFound] = useState(!code);

  const inviterName = invite?.display_name?.trim() || (invite ? `@${invite.username}` : null);
  useDocumentTitle(inviterName ? `Invitación de ${inviterName}` : 'Invitación');

  useEffect(() => {
    if (!code) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    saveInviteCode(code);
    let active = true;

    void (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const data = await apiFetch<{ invite: InvitePreview }>(
          `/api/invites/${encodeURIComponent(code)}`,
        );
        if (!active) return;
        setInvite(data.invite);
        saveInviteCode(data.invite.code);
      } catch {
        if (!active) return;
        setInvite(null);
        setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [code]);

  if (!authLoading && user && invite) {
    return <Navigate to={safeReturnPath(profilePath(invite.username))} replace />;
  }

  if (!authLoading && user && notFound) {
    return <Navigate to="/home" replace />;
  }

  if (loading || authLoading) {
    return (
      <AuthLayout title="Invitación" subtitle="Cargando…">
        <div className="space-y-4" role="status" aria-label="Cargando invitación">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto h-4 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      </AuthLayout>
    );
  }

  if (notFound || !invite) {
    return (
      <AuthLayout
        title="Invitación no válida"
        subtitle="Este enlace no corresponde a un perfil de Ninety"
      >
        <p className="text-sm text-muted-foreground">
          Pide a quien te invitó un enlace nuevo, o crea tu cuenta directamente.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to={registerPath()}>Crear cuenta</Link>
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to={loginPath()} className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </AuthLayout>
    );
  }

  const name = invite.display_name?.trim() || `@${invite.username}`;
  const nextAfterAuth = profilePath(invite.username);

  return (
    <AuthLayout
      title={`${name} te invita`}
      subtitle="Únete a Ninety y guarda los partidos que vives"
    >
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        {invite.avatar_url ? (
          <img
            src={invite.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-xl font-semibold text-primary">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{name}</span> usa Ninety como diario
          futbolero. Crea tu cuenta para empezar el tuyo.
        </p>
      </div>

      <Button asChild className="w-full">
        <Link to={registerPath(nextAfterAuth)}>Crear cuenta</Link>
      </Button>
      <Button asChild variant="secondary" className="mt-3 w-full">
        <Link to={loginPath(nextAfterAuth)}>Ya tengo cuenta</Link>
      </Button>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Al registrarte se asociará esta invitación a tu cuenta (solo cuentas nuevas).
      </p>
    </AuthLayout>
  );
}

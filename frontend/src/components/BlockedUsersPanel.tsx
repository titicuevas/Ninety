import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { BlockUserButton } from '@/components/BlockUserButton';
import { useBlockedUsers } from '@/hooks/useBlockUser';
import { publicProfilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Lista de usuarios bloqueados (sin perfil ni Capsules en feed). */
export function BlockedUsersPanel({ className }: Props) {
  const { data, isLoading, isError } = useBlockedUsers();
  const profiles = data?.profiles ?? [];

  return (
    <section
      className={cn('space-y-3', className)}
      aria-labelledby="blocked-users-heading"
      data-testid="blocked-users-panel"
    >
      <div className="min-w-0">
        <h2
          id="blocked-users-heading"
          className="inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <Ban className="h-4 w-4 text-primary" aria-hidden />
          Usuarios bloqueados
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No verás su perfil ni Capsules en el feed. Ellos tampoco verán el tuyo. Más fuerte que
          silenciar alertas.
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          No se pudo cargar la lista de bloqueados.
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="blocked-users-empty">
          Nadie bloqueado. Puedes bloquear desde el perfil de un aficionado.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Usuarios bloqueados">
          {profiles.map((profile) => {
            const name = profile.display_name || profile.username || 'Usuario';
            const href = publicProfilePath(profile.username);
            return (
              <li
                key={profile.id}
                className="flex items-center gap-3 rounded-lg border border-border p-2.5"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link
                      to={href}
                      className="truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {name}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium">{name}</p>
                  )}
                  {profile.username ? (
                    <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
                  ) : null}
                </div>
                {profile.username ? (
                  <BlockUserButton
                    username={profile.username}
                    blockedByMe
                    size="compact"
                    className="shrink-0"
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

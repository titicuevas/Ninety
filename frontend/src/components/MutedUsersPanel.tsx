import { Link } from 'react-router-dom';
import { BellOff } from 'lucide-react';
import { MuteUserButton } from '@/components/MuteUserButton';
import { useMutedUsers } from '@/hooks/useMuteUser';
import { publicProfilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Lista de usuarios silenciados (sin alertas in-app + push). */
export function MutedUsersPanel({ className }: Props) {
  const { data, isLoading, isError } = useMutedUsers();
  const profiles = data?.profiles ?? [];

  return (
    <section
      className={cn('space-y-3', className)}
      aria-labelledby="muted-users-heading"
      data-testid="muted-users-panel"
    >
      <div className="min-w-0">
        <h2
          id="muted-users-heading"
          className="inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <BellOff className="h-4 w-4 text-primary" aria-hidden />
          Usuarios silenciados
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No recibirás likes, comentarios ni follows de estas personas en alertas ni push.
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          No se pudo cargar la lista de silenciados.
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="muted-users-empty">
          Nadie silenciado. Puedes silenciar desde un perfil o una alerta de un solo actor.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Usuarios silenciados">
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
                  <MuteUserButton
                    username={profile.username}
                    mutedByMe
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

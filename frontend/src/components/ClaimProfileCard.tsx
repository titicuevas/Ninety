import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';
import { FavoriteTeamField } from '@/components/FavoriteTeamField';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  isUsernameFormatValid,
  useUsernameAvailability,
} from '@/hooks/useUsernameAvailability';
import { useAuth } from '@/hooks/useAuthInit';
import { apiFetch } from '@/lib/api';
import { friendlyApiError } from '@/lib/friendlyErrors';
import { isAutoUsername, suggestUsername } from '@/lib/profileHelpers';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';
import type { Profile, UpdateProfileInput } from '@/types/profile';
import { cn } from '@/lib/utils';

type Props = {
  profile?: Profile | null;
  welcome?: boolean;
  onWelcomeDismiss?: () => void;
};

export function ClaimProfileCard({ profile, welcome = false, onWelcomeDismiss }: Props) {
  const { user } = useAuth();
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();

  const metadataName =
    typeof user?.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : typeof user?.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : typeof user?.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : undefined;

  const [displayName, setDisplayName] = useState(
    () => profile?.display_name?.trim() || metadataName || '',
  );
  const [username, setUsername] = useState(() =>
    profile?.username && !isAutoUsername(profile.username) ? profile.username : '',
  );
  const [favoriteTeam, setFavoriteTeam] = useState(() => profile?.favorite_team ?? '');
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName((prev) => prev || profile.display_name?.trim() || metadataName || '');
    if (profile.username && !isAutoUsername(profile.username)) {
      setUsername((prev) => prev || profile.username || '');
    }
    setFavoriteTeam((prev) => prev || profile.favorite_team || '');
  }, [profile, metadataName]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedUsername(username.trim().toLowerCase());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [username]);

  const usernameCheck = useUsernameAvailability(debouncedUsername, profile?.username);
  const usernameFormatOk = isUsernameFormatValid(debouncedUsername);
  const isCurrentUsername =
    !!profile?.username &&
    !isAutoUsername(profile.username) &&
    profile.username.toLowerCase() === debouncedUsername;
  const usernameTaken =
    usernameFormatOk && !isCurrentUsername && usernameCheck.data?.available === false;
  const usernameFree =
    usernameFormatOk && (isCurrentUsername || usernameCheck.data?.available === true);

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      apiFetch<Profile>('/api/profile/me', { method: 'PATCH', body: JSON.stringify(data) }, session?.access_token),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'me'], data);
      void queryClient.invalidateQueries({ queryKey: ['profile', 'public'] });
      void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
      void queryClient.invalidateQueries({ queryKey: ['follow'] });
      toast.success('Perfil listo — ya puedes compartir y descubrir');
      onWelcomeDismiss?.();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? friendlyApiError(err.message) : 'No se pudo guardar el perfil');
    },
  });

  const applySuggestedUsername = () => {
    const suggestion = suggestUsername(displayName);
    if (suggestion) {
      setUsername(suggestion);
      setUsernameError(null);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    const handle = username.trim().toLowerCase();
    let valid = true;

    if (name.length < 2) {
      setNameError('Mínimo 2 caracteres');
      valid = false;
    } else {
      setNameError(null);
    }

    if (!isUsernameFormatValid(handle)) {
      setUsernameError('Mínimo 3 caracteres: a-z, 0-9 y _');
      valid = false;
    } else if (usernameTaken) {
      setUsernameError('Ese username ya está en uso');
      valid = false;
    } else {
      setUsernameError(null);
    }

    if (!valid || (usernameFormatOk && usernameCheck.isFetching)) return;

    mutation.mutate({
      display_name: name,
      username: handle,
      favorite_team: favoriteTeam.trim() || null,
    });
  };

  const title = welcome ? 'Bienvenido a Ninety' : 'Elige tu identidad pública';
  const subtitle = welcome
    ? 'Elige nombre y username para que otros te encuentren. Luego guarda un partido y sigue aficionados.'
    : 'Sin username real no puedes compartir perfil ni destacar en el feed. Tarda menos de un minuto.';

  return (
    <Card
      id="claim-profile"
      className="scroll-mt-24 border-primary/40 bg-primary/5 motion-reveal"
      data-testid="claim-profile-card"
    >
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {welcome && onWelcomeDismiss ? (
            <Button type="button" variant="ghost" size="sm" className="shrink-0 self-end sm:self-start" onClick={onWelcomeDismiss}>
              Cerrar
            </Button>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormField label="Nombre" error={nameError ?? undefined}>
            <Input
              id="claim-display-name"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="Tu nombre o apodo"
              autoComplete="name"
              autoFocus={welcome}
            />
          </FormField>

          <div className="space-y-1.5">
            <FormField
              label="Username"
              error={usernameError ?? (usernameTaken ? 'Ese username ya está en uso' : undefined)}
              hint="Público. Solo minúsculas, números y guiones bajos."
            >
              <Input
                id="claim-username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  if (usernameError) setUsernameError(null);
                }}
                placeholder="henry_madridista"
                autoComplete="username"
              />
            </FormField>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={applySuggestedUsername}
                disabled={!suggestUsername(displayName)}
              >
                Sugerir
              </Button>
              <p
                id="claim-username-availability"
                className={cn(
                  'flex min-h-5 items-center gap-1.5 text-xs',
                  usernameTaken && 'text-destructive',
                  usernameFree && 'text-primary',
                  !usernameTaken && !usernameFree && 'text-muted-foreground',
                )}
                role="status"
                aria-live="polite"
              >
                {!debouncedUsername ? (
                  <span>Elige un username único</span>
                ) : !usernameFormatOk ? (
                  <span>Mínimo 3 caracteres: a-z, 0-9 y _</span>
                ) : usernameCheck.isFetching ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Comprobando disponibilidad…
                  </>
                ) : usernameTaken ? (
                  <>
                    <X className="h-3.5 w-3.5" aria-hidden />
                    No disponible
                  </>
                ) : usernameFree ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {isCurrentUsername || usernameCheck.data?.own
                      ? 'Es tu username actual'
                      : 'Disponible'}
                  </>
                ) : usernameCheck.isError ? (
                  <span>No se pudo comprobar ahora</span>
                ) : null}
              </p>
            </div>
          </div>

          <FormField
            label="Equipo favorito"
            hint="Opcional — mejora las sugerencias de gente en descubrir."
          >
            <FavoriteTeamField
              id="claim-favorite-team"
              value={favoriteTeam}
              onChange={setFavoriteTeam}
              placeholder="Ej: FC Barcelona"
            />
          </FormField>

          {mutation.error ? (
            <p className="text-sm text-destructive" role="alert">
              {friendlyApiError((mutation.error as Error).message)}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="submit"
              loading={mutation.isPending}
              className="w-full sm:w-auto"
              disabled={usernameTaken || (usernameFormatOk && usernameCheck.isFetching)}
            >
              Guardar y continuar
            </Button>
            <Button asChild type="button" variant="ghost" size="sm" className="w-full sm:w-auto">
              <Link to="/profile">Abrir editor de perfil</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Loader2, Settings, User, UserPlus, Users, X } from 'lucide-react';
import { DirtyLeaveDialog } from '@/components/DirtyLeaveDialog';
import { FavoriteTeamField } from '@/components/FavoriteTeamField';
import { Layout } from '@/components/Layout';
import { ShareInviteButton } from '@/components/ShareInviteButton';
import { ShareProfileButton } from '@/components/ShareProfileButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useDirtyLeave } from '@/hooks/useDirtyLeave';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  isUsernameFormatValid,
  useUsernameAvailability,
} from '@/hooks/useUsernameAvailability';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/lib/api';
import { friendlyApiError } from '@/lib/friendlyErrors';
import { toast } from '@/lib/toast';
import { AVATAR_ACCEPT, removeProfileAvatar, uploadProfileAvatar } from '@/lib/profileAvatar';
import { isAutoUsername, suggestUsername } from '@/lib/profileHelpers';
import { profilePath } from '@/lib/profilePath';
import type { Profile, UpdateProfileInput } from '@/types/profile';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  display_name: z.string().min(2, 'Mínimo 2 caracteres'),
  username: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y _'),
  favorite_team: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().max(280, 'Máximo 280 caracteres').optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

function profileToFormValues(
  data: Profile,
  metadataName?: string,
): ProfileForm {
  return {
    display_name: data.display_name ?? metadataName ?? '',
    username: isAutoUsername(data.username) ? '' : (data.username ?? ''),
    favorite_team: data.favorite_team ?? '',
    country: data.country ?? '',
    city: data.city ?? '',
    bio: data.bio ?? '',
  };
}

function ProfileAvatarSection({
  avatarUrl,
  profile,
  userEmail,
  avatarBusy,
  avatarError,
  hasCustomAvatar,
  fileInputRef,
  onAvatarSelected,
  onRemoveAvatar,
}: {
  avatarUrl: string | null;
  profile: Profile | undefined;
  userEmail: string | undefined;
  avatarBusy: boolean;
  avatarError: string | null;
  hasCustomAvatar: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onAvatarSelected: (file: File | undefined) => void;
  onRemoveAvatar: () => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
        />
      ) : (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          {(profile?.display_name ?? userEmail ?? '?').slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="truncate font-medium">{profile?.display_name ?? 'Aficionado'}</p>
        <p className="truncate text-sm text-muted-foreground">{userEmail}</p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="sr-only"
            aria-label="Elegir foto de perfil"
            onChange={(e) => void onAvatarSelected(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={avatarBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            {hasCustomAvatar ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          {hasCustomAvatar ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={avatarBusy}
              onClick={() => void onRemoveAvatar()}
            >
              Quitar foto
            </Button>
          ) : null}
        </div>
        {avatarError ? <p className="text-xs text-destructive">{avatarError}</p> : null}
        {profile?.username && !isAutoUsername(profile.username) ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to={profilePath(profile.username)}>
                <User className="h-4 w-4 sm:mr-1.5" aria-hidden />
                <span className="sr-only sm:not-sr-only">Perfil público</span>
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to={`/u/${encodeURIComponent(profile.username)}/followers`}>
                <Users className="h-4 w-4 sm:mr-1.5" aria-hidden />
                <span className="sr-only sm:not-sr-only">Seguidores</span>
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
              <Link to={`/u/${encodeURIComponent(profile.username)}/following`}>
                <UserPlus className="h-4 w-4 sm:mr-1.5" aria-hidden />
                <span className="sr-only sm:not-sr-only">Siguiendo</span>
              </Link>
            </Button>
            <ShareProfileButton
              username={profile.username}
              displayName={profile.display_name}
              favoriteTeam={profile.favorite_team}
              city={profile.city}
              country={profile.country}
              followersCount={profile.followers_count}
              size="sm"
              variant="outline"
              compact
            />
            <ShareInviteButton
              username={profile.username}
              displayName={profile.display_name}
              size="sm"
              variant="outline"
              compact
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Elige un username abajo para poder compartir tu perfil público.
          </p>
        )}
      </div>
    </div>
  );
}

type ProfileEditFormProps = {
  register: ReturnType<typeof useForm<ProfileForm>>['register'];
  errors: ReturnType<typeof useForm<ProfileForm>>['formState']['errors'];
  displayName: string;
  debouncedUsername: string;
  usernameFormatOk: boolean;
  usernameCheck: ReturnType<typeof useUsernameAvailability>;
  usernameTaken: boolean;
  usernameFree: boolean;
  isCurrentUsername: boolean;
  favoriteTeam: string;
  bioValue: string;
  onApplySuggestedUsername: () => void;
  onFavoriteTeamChange: (value: string) => void;
  mutationError: Error | null;
  mutationPending: boolean;
  onSubmit: (data: ProfileForm) => void;
  handleSubmit: ReturnType<typeof useForm<ProfileForm>>['handleSubmit'];
};

function ProfileEditForm({
  register,
  errors,
  displayName,
  debouncedUsername,
  usernameFormatOk,
  usernameCheck,
  usernameTaken,
  usernameFree,
  isCurrentUsername,
  favoriteTeam,
  bioValue,
  onApplySuggestedUsername,
  onFavoriteTeamChange,
  mutationError,
  mutationPending,
  onSubmit,
  handleSubmit,
}: ProfileEditFormProps) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Nombre" error={errors.display_name?.message}>
        <Input placeholder="Tu nombre o apodo" {...register('display_name')} />
      </FormField>

      <FormField
        label="Username"
        error={
          errors.username?.message ??
          (usernameTaken ? 'Ese username ya está en uso' : undefined)
        }
        hint="Público. Solo minúsculas, números y guiones bajos."
      >
        <div className="flex gap-2">
          <Input
            placeholder="henry_madridista"
            className="flex-1"
            autoComplete="username"
            aria-describedby="username-availability"
            {...register('username')}
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={onApplySuggestedUsername}
            disabled={!suggestUsername(displayName)}
          >
            Sugerir
          </Button>
        </div>
      </FormField>
      <p
        id="username-availability"
        className={cn(
          '-mt-2 flex min-h-5 items-center gap-1.5 text-xs',
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

      <FormField label="Equipo favorito" hint="Escribe y elige una sugerencia, o deja el nombre libre.">
        <FavoriteTeamField
          value={favoriteTeam}
          onChange={onFavoriteTeamChange}
          placeholder="Ej: FC Barcelona"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="País">
          <Input placeholder="España" {...register('country')} />
        </FormField>
        <FormField label="Ciudad">
          <Input placeholder="Barcelona" {...register('city')} />
        </FormField>
      </div>

      <FormField
        label="Bio"
        error={errors.bio?.message}
        hint={`${bioValue.length}/280 · Opcional, visible en tu perfil público`}
      >
        <Textarea
          rows={3}
          className="min-h-24 resize-y"
          placeholder="Aficionado, estadio o cómo vives el fútbol…"
          maxLength={280}
          {...register('bio')}
        />
      </FormField>

      {mutationError ? (
        <p className="text-sm text-destructive">{mutationError.message}</p>
      ) : null}

      <Button
        type="submit"
        loading={mutationPending}
        className="w-full"
        disabled={usernameTaken || (usernameFormatOk && usernameCheck.isFetching)}
      >
        Guardar perfil
      </Button>
    </form>
  );
}

export function ProfilePage() {
  useDocumentTitle('Perfil');
  const { user } = useAuth();
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const metadataName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  const displayName = watch('display_name');
  const usernameValue = watch('username') ?? '';
  const bioValue = watch('bio') ?? '';
  const favoriteTeam = watch('favorite_team') ?? '';
  const [debouncedUsername, setDebouncedUsername] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedUsername(usernameValue.trim().toLowerCase());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [usernameValue]);

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

  const applyProfile = (data: Profile) => {
    queryClient.setQueryData(['profile', 'me'], data);
    void queryClient.invalidateQueries({ queryKey: ['profile', 'public'] });
    void queryClient.invalidateQueries({ queryKey: ['capsules', 'feed'] });
  };

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      apiFetch<Profile>('/api/profile/me', { method: 'PATCH', body: JSON.stringify(data) }, session?.access_token),
    onSuccess: (data) => {
      applyProfile(data);
      reset(profileToFormValues(data, metadataName));
      toast.success('Perfil actualizado');
    },
  });

  const { leaveOpen, confirmLeave, dismissLeave } = useDirtyLeave({
    isDirty,
    isBusy: mutation.isPending,
  });

  useEffect(() => {
    if (!profile || isDirty) return;
    reset(profileToFormValues(profile, metadataName));
  }, [profile, reset, metadataName, isDirty]);

  const applySuggestedUsername = () => {
    const suggestion = suggestUsername(displayName);
    if (suggestion) setValue('username', suggestion, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = (data: ProfileForm) => {
    if (usernameTaken) return;
    mutation.mutate({
      display_name: data.display_name,
      username: data.username,
      favorite_team: data.favorite_team || null,
      country: data.country || null,
      city: data.city || null,
      bio: data.bio?.trim() || null,
    });
  };

  const onAvatarSelected = async (file: File | undefined) => {
    if (!file || !session?.access_token) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const updated = await uploadProfileAvatar(file, session.access_token);
      applyProfile(updated);
      toast.success('Foto de perfil actualizada');
    } catch (err) {
      const message = err instanceof Error ? friendlyApiError(err.message) : 'No se pudo subir la foto';
      setAvatarError(message);
      toast.error(message);
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onRemoveAvatar = async () => {
    if (!session?.access_token) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const updated = await removeProfileAvatar(session.access_token);
      applyProfile(updated);
      toast.success('Foto de perfil eliminada');
    } catch (err) {
      const message = err instanceof Error ? friendlyApiError(err.message) : 'No se pudo quitar la foto';
      setAvatarError(message);
      toast.error(message);
    } finally {
      setAvatarBusy(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <Card className="mx-auto max-w-lg border-border" role="status" aria-label="Cargando perfil">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const avatarUrl =
    profile?.avatar_url ??
    (typeof user?.user_metadata?.picture === 'string' ? user.user_metadata.picture : null);
  const hasCustomAvatar = !!profile?.avatar_url;

  return (
    <Layout>
      <Card className="mx-auto max-w-lg border-border">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold leading-none tracking-tight">Tu perfil</h1>
            <CardDescription>Configura tu identidad como aficionado</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
            <Link to="/settings">
              <Settings className="h-4 w-4 sm:mr-1.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">Ajustes</span>
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ProfileAvatarSection
            avatarUrl={avatarUrl}
            profile={profile}
            userEmail={user?.email}
            avatarBusy={avatarBusy}
            avatarError={avatarError}
            hasCustomAvatar={hasCustomAvatar}
            fileInputRef={fileInputRef}
            onAvatarSelected={onAvatarSelected}
            onRemoveAvatar={onRemoveAvatar}
          />

          <ProfileEditForm
            register={register}
            errors={errors}
            displayName={displayName}
            debouncedUsername={debouncedUsername}
            usernameFormatOk={usernameFormatOk}
            usernameCheck={usernameCheck}
            usernameTaken={usernameTaken}
            usernameFree={usernameFree}
            isCurrentUsername={isCurrentUsername}
            favoriteTeam={favoriteTeam}
            bioValue={bioValue}
            onApplySuggestedUsername={applySuggestedUsername}
            onFavoriteTeamChange={(value) =>
              setValue('favorite_team', value, { shouldDirty: true, shouldValidate: true })
            }
            mutationError={mutation.error as Error | null}
            mutationPending={mutation.isPending}
            onSubmit={onSubmit}
            handleSubmit={handleSubmit}
          />
        </CardContent>
      </Card>

      <DirtyLeaveDialog
        open={leaveOpen}
        description="Perderás los cambios de tu perfil."
        onConfirm={confirmLeave}
        onCancel={dismissLeave}
      />
    </Layout>
  );
}

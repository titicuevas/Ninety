import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/Layout';
import { ShareProfileButton } from '@/components/ShareProfileButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuthInit';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/lib/api';
import { friendlyApiError } from '@/lib/friendlyErrors';
import { AVATAR_ACCEPT, removeProfileAvatar, uploadProfileAvatar } from '@/lib/profileAvatar';
import { isAutoUsername, suggestUsername } from '@/lib/profileHelpers';
import { profilePath } from '@/lib/profilePath';
import type { Profile, UpdateProfileInput } from '@/types/profile';

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

export function ProfilePage() {
  const { user } = useAuth();
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [success, setSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  const displayName = watch('display_name');
  const bioValue = watch('bio') ?? '';

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
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  useEffect(() => {
    if (profile) {
      const metadataName =
        typeof user?.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user?.user_metadata?.name === 'string'
            ? user.user_metadata.name
            : undefined;

      reset({
        display_name: profile.display_name ?? metadataName ?? '',
        username: isAutoUsername(profile.username) ? '' : (profile.username ?? ''),
        favorite_team: profile.favorite_team ?? '',
        country: profile.country ?? '',
        city: profile.city ?? '',
        bio: profile.bio ?? '',
      });
    }
  }, [profile, reset, user]);

  const applySuggestedUsername = () => {
    const suggestion = suggestUsername(displayName);
    if (suggestion) setValue('username', suggestion, { shouldValidate: true });
  };

  const onSubmit = (data: ProfileForm) => {
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
    } catch (err) {
      setAvatarError(err instanceof Error ? friendlyApiError(err.message) : 'No se pudo subir la foto');
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
    } catch (err) {
      setAvatarError(err instanceof Error ? friendlyApiError(err.message) : 'No se pudo quitar la foto');
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
        <CardHeader>
          <CardTitle>Tu perfil</CardTitle>
          <CardDescription>Configura tu identidad como aficionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {(profile?.display_name ?? user?.email ?? '?').slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="truncate font-medium">{profile?.display_name ?? 'Aficionado'}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <Link to={profilePath(profile.username)} className="text-sm text-primary hover:underline">
                    Ver perfil público
                  </Link>
                  <Link
                    to={`/u/${encodeURIComponent(profile.username)}/followers`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Seguidores
                  </Link>
                  <Link
                    to={`/u/${encodeURIComponent(profile.username)}/following`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Siguiendo
                  </Link>
                  <ShareProfileButton
                    username={profile.username}
                    displayName={profile.display_name}
                    size="sm"
                    variant="outline"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Elige un username abajo para poder compartir tu perfil público.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Nombre" error={errors.display_name?.message}>
              <Input placeholder="Tu nombre o apodo" {...register('display_name')} />
            </FormField>

            <FormField
              label="Username"
              error={errors.username?.message}
              hint="Público. Solo minúsculas, números y guiones bajos."
            >
              <div className="flex gap-2">
                <Input placeholder="henry_madridista" className="flex-1" {...register('username')} />
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  onClick={applySuggestedUsername}
                  disabled={!suggestUsername(displayName)}
                >
                  Sugerir
                </Button>
              </div>
            </FormField>

            <FormField label="Equipo favorito">
              <Input placeholder="Ej: FC Barcelona" {...register('favorite_team')} />
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

            {mutation.error ? (
              <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
            ) : null}
            {success ? <p className="text-sm text-primary">Perfil actualizado correctamente</p> : null}

            <Button type="submit" loading={mutation.isPending} className="w-full">
              Guardar perfil
            </Button>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
}

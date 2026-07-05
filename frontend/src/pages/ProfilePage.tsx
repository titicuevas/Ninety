import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuthInit';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/lib/api';
import { isAutoUsername, suggestUsername } from '@/lib/profileHelpers';
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
});

type ProfileForm = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const { user } = useAuth();
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  const displayName = watch('display_name');

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      apiFetch<Profile>('/api/profile/me', { method: 'PATCH', body: JSON.stringify(data) }, session?.access_token),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'me'], data);
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
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  const avatarUrl =
    profile?.avatar_url ??
    (typeof user?.user_metadata?.picture === 'string' ? user.user_metadata.picture : null);

  return (
    <Layout>
      <Card className="mx-auto max-w-lg border-border">
        <CardHeader>
          <CardTitle>Tu perfil</CardTitle>
          <CardDescription>Configura tu identidad como aficionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="h-16 w-16 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {(profile?.display_name ?? user?.email ?? '?').slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{profile?.display_name ?? 'Aficionado'}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
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

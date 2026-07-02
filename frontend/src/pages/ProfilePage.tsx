import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useProfile } from '../hooks/useProfile';
import { useAuthStore } from '../stores/authStore';
import { apiFetch } from '../lib/api';
import type { Profile, UpdateProfileInput } from '../types/profile';

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
  bio: z.string().max(500).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export function ProfilePage() {
  const session = useAuthStore((s) => s.session);
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  const mutation = useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      apiFetch<Profile>('/api/profile/me', { method: 'PATCH', body: JSON.stringify(data) }, session?.access_token),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'me'], data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </Layout>
    );
  }

  useEffect(() => {
    if (profile) {
      reset({
        display_name: profile.display_name ?? '',
        username: profile.username ?? '',
        favorite_team: profile.favorite_team ?? '',
        country: profile.country ?? '',
        city: profile.city ?? '',
        bio: profile.bio ?? '',
      });
    }
  }, [profile, reset]);

  const onSubmit = (data: ProfileForm) => {
    mutation.mutate({
      display_name: data.display_name,
      username: data.username,
      favorite_team: data.favorite_team || null,
      country: data.country || null,
      city: data.city || null,
      bio: data.bio || null,
    });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tu perfil</h1>
          <p className="mt-1 text-sm text-muted">Configura tu identidad como aficionado</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre"
            error={errors.display_name?.message}
            {...register('display_name')}
          />
          <Input
            label="Username"
            placeholder="tu_username"
            error={errors.username?.message}
            {...register('username')}
          />
          <Input
            label="Equipo favorito"
            placeholder="Ej: Real Madrid"
            {...register('favorite_team')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="País" placeholder="España" {...register('country')} />
            <Input label="Ciudad" placeholder="Madrid" {...register('city')} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Bio</label>
            <textarea
              className="w-full rounded-lg border border-border bg-surface-overlay px-3 py-2.5 text-sm text-white placeholder:text-muted outline-none transition-colors focus:border-accent"
              rows={3}
              placeholder="Cuéntanos sobre ti como aficionado..."
              {...register('bio')}
            />
          </div>

          {mutation.error && (
            <p className="text-sm text-red-400">{(mutation.error as Error).message}</p>
          )}
          {success && <p className="text-sm text-accent">Perfil actualizado correctamente</p>}

          <Button type="submit" loading={mutation.isPending} className="w-full">
            Guardar perfil
          </Button>
        </form>
      </div>
    </Layout>
  );
}

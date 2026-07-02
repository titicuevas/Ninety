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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/lib/api';
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

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Card className="mx-auto max-w-lg border-border">
        <CardHeader>
          <CardTitle>Tu perfil</CardTitle>
          <CardDescription>Configura tu identidad como aficionado</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Nombre" error={errors.display_name?.message}>
              <Input {...register('display_name')} />
            </FormField>
            <FormField label="Username" error={errors.username?.message}>
              <Input placeholder="tu_username" {...register('username')} />
            </FormField>
            <FormField label="Equipo favorito">
              <Input placeholder="Ej: Real Madrid" {...register('favorite_team')} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="País">
                <Input placeholder="España" {...register('country')} />
              </FormField>
              <FormField label="Ciudad">
                <Input placeholder="Madrid" {...register('city')} />
              </FormField>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={3} placeholder="Cuéntanos sobre ti como aficionado..." {...register('bio')} />
            </div>

            {mutation.error && (
              <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
            )}
            {success && <p className="text-sm text-primary">Perfil actualizado correctamente</p>}

            <Button type="submit" loading={mutation.isPending} className="w-full">
              Guardar perfil
            </Button>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
}

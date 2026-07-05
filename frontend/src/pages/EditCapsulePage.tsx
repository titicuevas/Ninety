import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCapsule, useDeleteCapsule, useUpdateCapsule } from '@/hooks/useCapsules';
import { capsuleToFootballMatch } from '@/lib/matchCapsule';
import { cn } from '@/lib/utils';

const capsuleSchema = z.object({
  watched_at: z.string().date('Fecha inválida'),
  note: z.string().max(2000).optional(),
});

type CapsuleForm = z.infer<typeof capsuleSchema>;

export function EditCapsulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: capsule, isLoading, isError } = useCapsule(id);
  const updateCapsule = useUpdateCapsule(id ?? '');
  const deleteCapsule = useDeleteCapsule();
  const [rating, setRating] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CapsuleForm>({ resolver: zodResolver(capsuleSchema) });

  useEffect(() => {
    if (capsule) {
      reset({
        watched_at: capsule.watched_at,
        note: capsule.note ?? '',
      });
      setRating(capsule.rating);
    }
  }, [capsule, reset]);

  if (!id) return <Navigate to="/capsules" replace />;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (isError || !capsule) {
    return (
      <Layout>
        <Card className="mx-auto max-w-lg border-destructive/40">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">No encontramos esta Capsule.</p>
            <Button asChild className="mt-4" variant="secondary">
              <Link to="/capsules">Volver</Link>
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const onSubmit = (data: CapsuleForm) => {
    updateCapsule.mutate(
      {
        watched_at: data.watched_at,
        rating,
        note: data.note?.trim() || null,
      },
      { onSuccess: () => navigate('/capsules', { replace: true }) },
    );
  };

  const handleDelete = () => {
    if (!window.confirm('¿Eliminar esta Capsule? No se puede deshacer.')) return;

    deleteCapsule.mutate(capsule.id, {
      onSuccess: () => navigate('/capsules', { replace: true }),
    });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-lg space-y-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Editar Capsule</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Actualiza tu recuerdo de este partido.
          </p>
        </section>

        <MatchCard match={capsuleToFootballMatch(capsule)} />

        <Card>
          <CardHeader>
            <CardTitle>Tu recuerdo</CardTitle>
            <CardDescription>Fecha, valoración y nota</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormField label="¿Cuándo lo viste?" error={errors.watched_at?.message}>
                <Input type="date" {...register('watched_at')} />
              </FormField>

              <div className="space-y-2">
                <Label>Valoración (opcional)</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(rating === value ? null : value)}
                      className={cn(
                        'rounded-lg p-2 transition-colors hover:bg-secondary',
                        rating != null && value <= rating ? 'text-primary' : 'text-muted-foreground',
                      )}
                      aria-label={`${value} estrellas`}
                    >
                      <Star className={cn('h-6 w-6', rating != null && value <= rating && 'fill-current')} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">Nota (opcional)</Label>
                <Textarea id="note" rows={4} {...register('note')} />
              </div>

              {updateCapsule.error ? (
                <p className="text-sm text-destructive">{(updateCapsule.error as Error).message}</p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" loading={updateCapsule.isPending} className="flex-1">
                  Guardar cambios
                </Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-destructive">Zona de peligro</p>
              <p className="text-sm text-muted-foreground">Elimina esta Capsule de tu diario.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              loading={deleteCapsule.isPending}
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

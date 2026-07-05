import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { defaultWatchedAt, footballMatchToCapsuleBase } from '@/lib/matchCapsule';
import { MatchCard } from '@/components/MatchCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCapsule } from '@/hooks/useCapsules';
import type { FootballMatch } from '@/types/football';
import { cn } from '@/lib/utils';

const capsuleSchema = z.object({
  watched_at: z.string().date('Fecha inválida'),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  note: z.string().max(2000).optional(),
});

type CapsuleForm = z.infer<typeof capsuleSchema>;

type LocationState = {
  match?: FootballMatch;
};

export function CreateCapsulePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const match = (location.state as LocationState | null)?.match;
  const createCapsule = useCreateCapsule();
  const [rating, setRating] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CapsuleForm>({
    resolver: zodResolver(capsuleSchema),
    defaultValues: {
      watched_at: match ? defaultWatchedAt(match) : '',
      note: '',
    },
  });

  if (!match) {
    return <Navigate to="/search" replace />;
  }

  const onSubmit = (data: CapsuleForm) => {
    createCapsule.mutate(
      {
        ...footballMatchToCapsuleBase(match),
        watched_at: data.watched_at,
        rating,
        note: data.note?.trim() || null,
      },
      {
        onSuccess: () => navigate('/capsules', { replace: true }),
      },
    );
  };

  return (
    <Layout>
      <div className="mx-auto max-w-lg space-y-6">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Nueva Capsule</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Guarda cómo viviste este partido en tu diario futbolero.
          </p>
        </section>

        <MatchCard match={match} />

        <Card>
          <CardHeader>
            <CardTitle>Tu recuerdo</CardTitle>
            <CardDescription>Cuándo lo viste, qué te pareció y qué recuerdas</CardDescription>
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
                <Textarea
                  id="note"
                  rows={4}
                  placeholder="Con quién lo viste, dónde, qué recuerdas..."
                  {...register('note')}
                />
              </div>

              {createCapsule.error ? (
                <p className="text-sm text-destructive">{(createCapsule.error as Error).message}</p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" loading={createCapsule.isPending} className="flex-1">
                  Guardar Capsule
                </Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

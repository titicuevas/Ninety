import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { Layout } from '@/components/Layout';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsules, useDeleteCapsule } from '@/hooks/useCapsules';
import { formatWatchedDate } from '@/lib/format';
import type { Capsule } from '@/types/capsule';

function formatScore(capsule: Capsule) {
  if (capsule.home_score == null || capsule.away_score == null) return null;
  return `${capsule.home_score} – ${capsule.away_score}`;
}

function CapsuleCard({ capsule, onDelete }: { capsule: Capsule; onDelete: (id: string) => void }) {
  const score = formatScore(capsule);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <CapsulePhotoGallery
          capsule={capsule}
          alt={`Foto del partido ${capsule.home_team_name} vs ${capsule.away_team_name}`}
          className="mb-4"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{capsule.home_team_name}</p>
            <p className="text-muted-foreground">{capsule.away_team_name}</p>
            {capsule.competition_name ? (
              <p className="mt-1 text-xs text-primary">{capsule.competition_name}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            {score ? <p className="font-semibold tabular-nums">{score}</p> : null}
            <p className="mt-0.5 text-xs text-muted-foreground">Visto {formatWatchedDate(capsule.watched_at)}</p>
          </div>
        </div>

        {capsule.rating ? (
          <div className="mt-3" aria-label={`Valoración: ${capsule.rating} de 5`}>
            <StarRating rating={capsule.rating} />
          </div>
        ) : null}

        {capsule.note ? <p className="mt-3 text-sm text-muted-foreground">{capsule.note}</p> : null}

        <div className="mt-4 flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to={`/capsules/${capsule.id}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(capsule.id)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CapsulesPage() {
  const { data, isLoading, isError, error } = useCapsules();
  const deleteCapsule = useDeleteCapsule();
  const capsules = data?.capsules ?? [];

  const handleDelete = (id: string) => {
    if (!window.confirm('¿Eliminar esta Capsule?')) return;
    deleteCapsule.mutate(id);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mis Capsules</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Todos los partidos que has guardado en tu diario.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/search">Buscar partido</Link>
          </Button>
        </section>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : null}

        {isError ? (
          <Card className="border-destructive/40">
            <CardContent className="p-5 text-sm text-destructive">
              {error instanceof Error ? error.message : 'No se pudieron cargar tus Capsules'}
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !isError && capsules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center sm:p-10">
              <p className="text-lg font-medium">Aún no tienes Capsules</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Busca un partido que hayas visto y guarda tu primer recuerdo.
              </p>
              <Button asChild className="mt-4">
                <Link to="/search">Buscar partido</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !isError && capsules.length > 0 ? (
          <ul className="space-y-3">
            {capsules.map((capsule) => (
              <li key={capsule.id}>
                <CapsuleCard capsule={capsule} onDelete={handleDelete} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Layout>
  );
}

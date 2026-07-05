import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCapsuleFeed } from '@/hooks/useCapsules';
import { useAuth } from '@/hooks/useAuthInit';
import { formatRelativeTime } from '@/lib/format';
import type { FeedCapsule } from '@/types/capsule';

function formatScore(capsule: FeedCapsule) {
  if (capsule.home_score == null || capsule.away_score == null) return null;
  return `${capsule.home_score} – ${capsule.away_score}`;
}

function authorLabel(capsule: FeedCapsule, currentUserId?: string) {
  const name = capsule.profiles?.display_name ?? capsule.profiles?.username ?? 'Aficionado';
  if (capsule.user_id === currentUserId) return `${name} (tú)`;
  return name;
}

function FeedCapsuleCard({ capsule, currentUserId }: { capsule: FeedCapsule; currentUserId?: string }) {
  const score = formatScore(capsule);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-primary">{authorLabel(capsule, currentUserId)}</p>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={capsule.created_at}>
            {formatRelativeTime(capsule.created_at)}
          </time>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{capsule.home_team_name}</p>
            <p className="text-muted-foreground">{capsule.away_team_name}</p>
            {capsule.competition_name ? (
              <p className="mt-1 text-xs text-muted-foreground">{capsule.competition_name}</p>
            ) : null}
          </div>
          {score ? <p className="shrink-0 font-semibold tabular-nums">{score}</p> : null}
        </div>

        {capsule.rating ? (
          <div className="mt-3" aria-label={`Valoración: ${capsule.rating} de 5`}>
            <StarRating rating={capsule.rating} />
          </div>
        ) : null}

        {capsule.note ? <p className="mt-3 text-sm text-muted-foreground">{capsule.note}</p> : null}
      </CardContent>
    </Card>
  );
}

export function FeedPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useCapsuleFeed();
  const capsules = data?.capsules ?? [];

  return (
    <Layout>
      <div className="space-y-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Feed</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Lo que otros aficionados están guardando en su diario.
          </p>
        </section>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : null}

        {isError ? (
          <Card className="border-destructive/40">
            <CardContent className="p-5 text-sm text-destructive">
              {error instanceof Error ? error.message : 'No se pudo cargar el feed'}
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && !isError && capsules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center sm:p-10">
              <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
              <p className="text-lg font-medium">El feed está vacío</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sé el primero en guardar un partido y compartir tu recuerdo con la comunidad.
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
                <FeedCapsuleCard capsule={capsule} currentUserId={user?.id} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Layout>
  );
}

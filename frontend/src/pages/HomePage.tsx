import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCapsules } from '@/hooks/useCapsules';
import { computeCapsuleStats, formatRating } from '@/lib/capsuleStats';
import { formatWatchedDate } from '@/lib/format';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuthInit';
import { isProfileIncomplete } from '@/lib/profileHelpers';
import type { Capsule } from '@/types/capsule';

function formatScore(capsule: Capsule) {
  if (capsule.home_score == null || capsule.away_score == null) return null;
  return `${capsule.home_score} – ${capsule.away_score}`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        {hint ? <p className="mt-1 text-xs text-primary">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function RecentCapsuleRow({ capsule }: { capsule: Capsule }) {
  const score = formatScore(capsule);

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {capsule.home_team_name} vs {capsule.away_team_name}
        </p>
        <p className="text-xs text-muted-foreground">Visto {formatWatchedDate(capsule.watched_at)}</p>
      </div>
      <div className="shrink-0 text-right">
        {score ? <p className="text-sm font-semibold tabular-nums">{score}</p> : null}
        {capsule.rating ? (
          <div className="mt-0.5 flex justify-end">
            <StarRating rating={capsule.rating} size="sm" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: capsulesData, isLoading } = useCapsules();
  const profileIncomplete = isProfileIncomplete(profile);

  const metadataName =
    typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : undefined;
  const name = profile?.display_name ?? metadataName ?? 'Aficionado';
  const capsules = capsulesData?.capsules ?? [];
  const stats = computeCapsuleStats(capsules);

  return (
    <Layout>
      <div className="space-y-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hola, {name} 👋</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Tu resumen como aficionado, al estilo Wrapped pero en versión beta.
          </p>
        </section>

        {profileIncomplete ? (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Completa tu perfil</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pon tu nombre y un username para que otros te reconozcan en el feed.
                </p>
              </div>
              <Button asChild variant="secondary" className="shrink-0">
                <Link to="/profile">Ir al perfil</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : stats.totalMatches === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center sm:p-8">
              <p className="text-lg font-medium">Aún no tienes estadísticas</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Guarda tu primer partido y aquí verás partidos vistos, valoración media y más.
              </p>
              <Button asChild className="mt-4">
                <Link to="/search">Buscar partido</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <StatCard label="Partidos vistos" value={String(stats.totalMatches)} />
              <StatCard
                label="Valoración media"
                value={formatRating(stats.averageRating)}
                hint={stats.ratedCount > 0 ? `${stats.ratedCount} valorados` : undefined}
              />
              <StatCard
                label="Competición top"
                value={stats.topCompetition ? String(stats.topCompetition.count) : '—'}
                hint={stats.topCompetition?.name}
              />
              <StatCard
                label="Equipo top"
                value={stats.topTeam ? String(stats.topTeam.count) : '—'}
                hint={stats.topTeam?.name}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Destacados
                  </CardTitle>
                  <CardDescription>Lo más reciente y lo que más te gustó</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {stats.lastWatched ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Último visto
                      </p>
                      <p className="mt-1 font-medium">
                        {stats.lastWatched.home_team_name} vs {stats.lastWatched.away_team_name}
                      </p>
                      <p className="text-muted-foreground">{formatWatchedDate(stats.lastWatched.watched_at)}</p>
                    </div>
                  ) : null}
                  {stats.bestRated ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Mejor valorado
                      </p>
                      <p className="mt-1 font-medium">
                        {stats.bestRated.home_team_name} vs {stats.bestRated.away_team_name}
                      </p>
                      <div className="mt-1">
                        <StarRating rating={stats.bestRated.rating ?? 0} />
                      </div>
                    </div>
                  ) : null}
                  <p className="text-muted-foreground">
                    {stats.notesCount}{' '}
                    {stats.notesCount === 1 ? 'nota escrita' : 'notas escritas'} en tu diario
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Últimos partidos</CardTitle>
                    <CardDescription>Tus Capsules más recientes</CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="shrink-0">
                    <Link to="/capsules">Ver todas</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {stats.recentCapsules.map((capsule) => (
                    <RecentCapsuleRow key={capsule.id} capsule={capsule} />
                  ))}
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div>
                  <p className="text-lg font-medium">Sigue construyendo tu historia</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Añade otro partido o mira qué guardan otros aficionados.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="secondary">
                    <Link to="/feed">Ver feed</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/search">Añadir partido</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}

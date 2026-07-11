import { Link } from 'react-router-dom';
import { Calendar, Sparkles, Star, Trophy, Users } from 'lucide-react';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { StarRating } from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatRating, type CapsuleStats } from '@/lib/capsuleStats';
import { formatWatchedDate } from '@/lib/format';
import type { Capsule } from '@/types/capsule';
import { cn } from '@/lib/utils';

function formatScore(capsule: Capsule) {
  if (capsule.home_score == null || capsule.away_score == null) return null;
  return `${capsule.home_score} – ${capsule.away_score}`;
}

function HighlightCard({
  label,
  title,
  subtitle,
  icon: Icon,
  className,
}: {
  label: string;
  title: string;
  subtitle?: string;
  icon: typeof Trophy;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm',
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200/80">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="text-lg font-semibold leading-snug">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
    </div>
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

interface WrappedSummaryProps {
  name: string;
  stats: CapsuleStats;
}

export function WrappedSummary({ name, stats }: WrappedSummaryProps) {
  const bestScore = stats.bestRated ? formatScore(stats.bestRated) : null;

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-emerald-600/30 via-emerald-900/20 to-background p-6 sm:p-8"
        aria-labelledby="wrapped-heading"
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs font-medium text-emerald-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Tu Wrapped · beta
          </p>

          <h2 id="wrapped-heading" className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            {name}, esto es tu fútbol
          </h2>
          <p className="mt-2 max-w-md text-sm text-white/75 sm:text-base">
            Un vistazo a los partidos que has vivido y lo que dicen de ti como aficionado.
          </p>

          <div className="mt-8 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
                {stats.totalMatches}
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-100/90">
                {stats.totalMatches === 1 ? 'partido en tu diario' : 'partidos en tu diario'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-black/25 px-4 py-3 backdrop-blur-sm">
                <p className="text-2xl font-bold tabular-nums">{formatRating(stats.averageRating)}</p>
                <p className="text-xs text-white/70">media ⭐</p>
              </div>
              <div className="rounded-xl bg-black/25 px-4 py-3 backdrop-blur-sm">
                <p className="text-2xl font-bold tabular-nums">{stats.notesCount}</p>
                <p className="text-xs text-white/70">{stats.notesCount === 1 ? 'nota' : 'notas'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {stats.topTeam ? (
          <HighlightCard
            label="Equipo top"
            title={stats.topTeam.name}
            subtitle={`Aparece en ${stats.topTeam.count} ${stats.topTeam.count === 1 ? 'partido' : 'partidos'}`}
            icon={Users}
          />
        ) : null}
        {stats.topCompetition ? (
          <HighlightCard
            label="Competición favorita"
            title={stats.topCompetition.name}
            subtitle={`${stats.topCompetition.count} ${stats.topCompetition.count === 1 ? 'partido' : 'partidos'}`}
            icon={Trophy}
          />
        ) : null}
        {stats.lastWatched ? (
          <HighlightCard
            label="Último visto"
            title={`${stats.lastWatched.home_team_name} vs ${stats.lastWatched.away_team_name}`}
            subtitle={formatWatchedDate(stats.lastWatched.watched_at)}
            icon={Calendar}
            className="sm:col-span-2"
          />
        ) : null}
      </section>

      {stats.bestRated ? (
        <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-card to-emerald-950/20">
          <CardContent className="p-0">
            <div className="border-b border-border/80 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Star className="h-3.5 w-3.5 fill-primary" aria-hidden="true" />
                Mejor valorado
              </div>
              <p className="mt-2 text-lg font-semibold">
                {stats.bestRated.home_team_name} vs {stats.bestRated.away_team_name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {bestScore ? <span className="text-sm font-medium tabular-nums">{bestScore}</span> : null}
                <StarRating rating={stats.bestRated.rating ?? 0} />
                {stats.bestRated.competition_name ? (
                  <span className="text-xs text-muted-foreground">{stats.bestRated.competition_name}</span>
                ) : null}
              </div>
            </div>
            <div className="px-5 pb-5 pt-4">
              <CapsulePhotoGallery
                capsule={stats.bestRated}
                alt={`Mejor partido: ${stats.bestRated.home_team_name} vs ${stats.bestRated.away_team_name}`}
              />
              {stats.bestRated.note ? (
                <p className="mt-3 text-sm italic text-muted-foreground">"{stats.bestRated.note}"</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stats.recentCapsules.length > 0 ? (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Actividad reciente</p>
                <p className="text-sm text-muted-foreground">Tus últimas Capsules</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link to="/capsules">Ver todas</Link>
              </Button>
            </div>
            {stats.recentCapsules.map((capsule) => (
              <RecentCapsuleRow key={capsule.id} capsule={capsule} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-medium">Sigue construyendo tu historia</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada partido que guardas hace tu Wrapped más interesante.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/feed">Ver feed</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link to="/search">Añadir partido</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

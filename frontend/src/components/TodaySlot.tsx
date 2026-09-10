import { Link } from 'react-router-dom';
import { CalendarDays, History, Star } from 'lucide-react';
import { TeamCrest } from '@/components/TeamCrest';
import { Button } from '@/components/ui/button';
import { formatCapsuleScore, formatWatchedDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DiaryAnniversary } from '@/lib/diaryAnniversary';
import type { WantToGoNudge } from '@/lib/wantToGoNudge';
import type { Capsule } from '@/types/capsule';

function todayLabel(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function AnniversarySlot({ anniversary }: { anniversary: DiaryAnniversary }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
        <History className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">
          Tal día como hoy
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{anniversary.matchLabel}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Hace {anniversary.yearsAgo === 1 ? '1 año' : `${anniversary.yearsAgo} años`}
          {anniversary.rating != null && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              · <Star className="h-2.5 w-2.5 fill-primary text-primary" aria-hidden />
              {anniversary.rating}
            </span>
          )}
        </p>
      </div>
      <Button asChild variant="ghost" size="sm" className="min-h-11 shrink-0 text-xs">
        <Link to={anniversary.href}>Revivir →</Link>
      </Button>
    </div>
  );
}

function WantToGoSlot({ nudge }: { nudge: WantToGoNudge }) {
  const isUpcoming = nudge.kind === 'upcoming';
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          isUpcoming ? 'bg-primary/15 text-primary' : 'bg-orange-500/15 text-orange-500',
        )}
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            isUpcoming ? 'text-primary' : 'text-orange-500',
          )}
        >
          {nudge.title}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">
          {nudge.homeTeam} vs {nudge.awayTeam}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{nudge.body}</p>
      </div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className={cn(
          'min-h-11 shrink-0 text-xs',
          isUpcoming ? 'text-primary' : 'text-orange-500',
        )}
      >
        <Link to={nudge.href}>{isUpcoming ? 'Ver lista →' : 'Guardar →'}</Link>
      </Button>
    </div>
  );
}

function LastCapsuleHero({ capsule }: { capsule: Capsule }) {
  const score = formatCapsuleScore(capsule.home_score, capsule.away_score);

  return (
    <Link
      to={`/c/${capsule.id}`}
      className="group block rounded-xl bg-background/40 p-3 transition-colors hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Último partido
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <TeamCrest name={capsule.home_team_name} crest={capsule.home_team_crest} size="md" />
          <p className="line-clamp-2 w-full text-xs font-medium leading-tight text-foreground sm:text-sm">
            {capsule.home_team_name}
          </p>
        </div>

        <div className="shrink-0 px-1 text-center">
          <p
            className={cn(
              'font-display text-3xl font-bold tabular-nums tracking-tight sm:text-4xl',
              score ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {score ?? 'vs'}
          </p>
          {capsule.rating != null ? (
            <p className="mt-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" aria-hidden />
              {capsule.rating}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground group-hover:text-primary">
              Ver →
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <TeamCrest name={capsule.away_team_name} crest={capsule.away_team_crest} size="md" />
          <p className="line-clamp-2 w-full text-xs font-medium leading-tight text-foreground sm:text-sm">
            {capsule.away_team_name}
          </p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {formatWatchedDate(capsule.watched_at)}
        {capsule.competition_name ? ` · ${capsule.competition_name}` : ''}
      </p>
    </Link>
  );
}

type Props = {
  capsules: Capsule[];
  anniversary: DiaryAnniversary | null;
  anniversaryVisible: boolean;
  wantToGoNudge: WantToGoNudge | null;
  wantToGoVisible: boolean;
  total?: number;
  className?: string;
};

export function TodaySlot({
  capsules,
  anniversary,
  anniversaryVisible,
  wantToGoNudge,
  wantToGoVisible,
  total,
  className,
}: Props) {
  const lastCapsule = capsules[0] ?? null;

  const hasContent =
    (anniversaryVisible && anniversary != null) ||
    (wantToGoVisible && wantToGoNudge != null) ||
    lastCapsule != null;

  if (!hasContent) return null;

  const showSignals =
    (anniversaryVisible && anniversary != null) || (wantToGoVisible && wantToGoNudge != null);

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.06] motion-reveal motion-reveal-delay-2',
        className,
      )}
      aria-labelledby="today-slot-heading"
      data-testid="today-slot"
    >
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3 sm:px-5">
        <p
          id="today-slot-heading"
          className="text-xs font-bold uppercase tracking-wider text-primary"
        >
          Hoy
        </p>
        <p className="ml-auto text-xs capitalize text-muted-foreground">{todayLabel()}</p>
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        {lastCapsule ? <LastCapsuleHero capsule={lastCapsule} /> : null}

        {showSignals ? (
          <div className="space-y-3 rounded-xl border border-border/40 bg-background/25 p-3 sm:p-3.5">
            {anniversaryVisible && anniversary ? (
              <AnniversarySlot anniversary={anniversary} />
            ) : null}
            {wantToGoVisible && wantToGoNudge ? (
              <WantToGoSlot nudge={wantToGoNudge} />
            ) : null}
          </div>
        ) : null}
      </div>

      {total != null && total > 0 ? (
        <p className="border-t border-border/30 px-4 py-2.5 text-center text-[11px] text-muted-foreground sm:px-5">
          <Link to="/capsules" className="inline-flex min-h-11 items-center hover:text-primary">
            {total} {total === 1 ? 'partido' : 'partidos'} en tu diario →
          </Link>
        </p>
      ) : null}
    </section>
  );
}

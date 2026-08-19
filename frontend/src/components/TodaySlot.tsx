import { Link } from 'react-router-dom';
import { CalendarDays, History, Star, Trophy } from 'lucide-react';
import { TeamCrest } from '@/components/TeamCrest';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCapsuleScore, formatWatchedDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DiaryAnniversary } from '@/lib/diaryAnniversary';
import type { WantToGoNudge } from '@/lib/wantToGoNudge';
import type { Capsule } from '@/types/capsule';

/* ── Helpers ───────────────────────────────────────────────── */

function todayLabel(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/* ── Sub-tarjetas ──────────────────────────────────────────── */

function AnniversarySlot({ anniversary }: { anniversary: DiaryAnniversary }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
        <History className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">Tal día como hoy</p>
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
      <Button asChild variant="ghost" size="sm" className="shrink-0 text-xs">
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
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUpcoming
            ? 'bg-primary/15 text-primary'
            : 'bg-orange-500/15 text-orange-500',
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
        className={cn('shrink-0 text-xs', isUpcoming ? 'text-primary' : 'text-orange-500')}
      >
        <Link to={nudge.href}>{isUpcoming ? 'Ver lista →' : 'Guardar →'}</Link>
      </Button>
    </div>
  );
}

function LastCapsuleSlot({ capsule }: { capsule: Capsule }) {
  const score = formatCapsuleScore(capsule.home_score, capsule.away_score);
  return (
    <div className="flex items-center gap-3">
      <TeamCrest name={capsule.home_team_name} crest={capsule.home_team_crest} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Último partido
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-foreground">
          {capsule.home_team_name}
          {score ? (
            <span className="mx-1.5 font-bold tabular-nums text-primary">{score}</span>
          ) : (
            <span className="mx-1.5 text-muted-foreground">vs</span>
          )}
          {capsule.away_team_name}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatWatchedDate(capsule.watched_at)}
          {capsule.rating != null && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              · <Star className="h-2.5 w-2.5 fill-primary text-primary" aria-hidden />
              {capsule.rating}
            </span>
          )}
        </p>
      </div>
      <TeamCrest name={capsule.away_team_name} crest={capsule.away_team_crest} size="sm" />
      <Button asChild variant="ghost" size="sm" className="shrink-0 text-xs">
        <Link to={`/c/${capsule.id}`}>Ver →</Link>
      </Button>
    </div>
  );
}

/* ── Componente principal ──────────────────────────────────── */

type Props = {
  /** Capsules del diario (para mostrar el último partido). */
  capsules: Capsule[];
  /** Aniversario de hoy (si existe). */
  anniversary: DiaryAnniversary | null;
  anniversaryVisible: boolean;
  /** Nudge de Quiero ir (upcoming o played). */
  wantToGoNudge: WantToGoNudge | null;
  wantToGoVisible: boolean;
  /** Total de Capsules — para mostrar el hito de forma compacta. */
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

  return (
    <Card
      className={cn(
        'border-border/60 bg-gradient-to-br from-card via-card to-primary/5 motion-reveal',
        className,
      )}
      data-testid="today-slot"
    >
      <CardContent className="p-4 sm:p-5">
        {/* Cabecera */}
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Hoy</p>
          <p className="ml-auto text-xs capitalize text-muted-foreground">{todayLabel()}</p>
        </div>

        {/* Contenido — hasta 3 secciones */}
        <div className="space-y-4 divide-y divide-border/40 [&>*:not(:first-child)]:pt-4">
          {anniversaryVisible && anniversary && (
            <AnniversarySlot anniversary={anniversary} />
          )}

          {wantToGoVisible && wantToGoNudge && (
            <WantToGoSlot nudge={wantToGoNudge} />
          )}

          {lastCapsule && (
            <LastCapsuleSlot capsule={lastCapsule} />
          )}
        </div>

        {/* Footer con total de partidos */}
        {total != null && total > 0 && (
          <p className="mt-4 border-t border-border/30 pt-3 text-center text-[11px] text-muted-foreground">
            <Link to="/capsules" className="inline-flex min-h-11 items-center hover:text-primary">
              {total} {total === 1 ? 'partido' : 'partidos'} en tu diario →
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

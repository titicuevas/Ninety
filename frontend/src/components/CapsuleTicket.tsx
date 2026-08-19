import type { ReactNode } from 'react';
import { TeamCrest } from '@/components/TeamCrest';
import { WatchContextBadge } from '@/components/WatchContextBadge';
import { formatCapsuleScore, formatWatchedDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Capsule } from '@/types/capsule';

export type CapsuleTicketMatch = Pick<
  Capsule,
  | 'home_team_name'
  | 'away_team_name'
  | 'home_team_crest'
  | 'away_team_crest'
  | 'home_score'
  | 'away_score'
  | 'competition_name'
  | 'watched_at'
  | 'watch_context'
>;

function TicketTeam({
  name,
  crest,
  size,
  align,
}: {
  name: string;
  crest: string | null;
  size: 'md' | 'lg';
  align: 'left' | 'right';
}) {
  return (
    <span
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2 sm:gap-3',
        align === 'right' && 'flex-row-reverse text-right',
      )}
    >
      <TeamCrest name={name} crest={crest} size={size} />
      <span
        className={cn(
          'min-w-0 truncate font-semibold leading-snug',
          size === 'lg' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm',
        )}
        title={name}
      >
        {name}
      </span>
    </span>
  );
}

type CapsuleTicketProps = {
  capsule: CapsuleTicketMatch;
  showWatchedDate?: boolean;
  competitionTone?: 'primary' | 'muted';
  badges?: ReactNode;
  /** En el detalle público el marcador es el h1. */
  titleAs?: 'p' | 'h1';
  size?: 'card' | 'detail';
  className?: string;
};

/** Franja tipo marcador: escudos, resultado y meta del partido. */
export function CapsuleTicket({
  capsule,
  showWatchedDate = false,
  competitionTone = 'primary',
  badges,
  titleAs = 'p',
  size = 'card',
  className,
}: CapsuleTicketProps) {
  const score = formatCapsuleScore(capsule.home_score, capsule.away_score);
  const crestSize = size === 'detail' ? 'lg' : 'md';
  const TitleTag = titleAs;
  const matchLabel = score
    ? `${capsule.home_team_name} ${score} ${capsule.away_team_name}`
    : `${capsule.home_team_name} vs ${capsule.away_team_name}`;

  return (
    <div className={cn('rounded-xl bg-secondary/55 px-2 py-3 sm:px-3 sm:py-3.5', className)}>
      <TitleTag className="m-0">
        <span className="sr-only">{matchLabel}</span>
        <span className="flex items-center gap-2 sm:gap-3" aria-hidden>
          <TicketTeam
            name={capsule.home_team_name}
            crest={capsule.home_team_crest}
            size={crestSize}
            align="left"
          />
          <span
            className={cn(
              'shrink-0 px-1 text-center font-display font-bold tabular-nums tracking-tight',
              size === 'detail' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-[2rem]',
              score ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {score ?? 'vs'}
          </span>
          <TicketTeam
            name={capsule.away_team_name}
            crest={capsule.away_team_crest}
            size={crestSize}
            align="right"
          />
        </span>
      </TitleTag>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {capsule.competition_name ? (
          <p
            className={cn(
              'max-w-[min(100%,14rem)] truncate text-[11px] font-medium sm:text-xs',
              competitionTone === 'primary' ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {capsule.competition_name}
          </p>
        ) : null}
        {showWatchedDate ? (
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Visto {formatWatchedDate(capsule.watched_at)}
          </p>
        ) : null}
        <WatchContextBadge context={capsule.watch_context} />
        {badges}
      </div>
    </div>
  );
}

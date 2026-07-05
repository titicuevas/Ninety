import { Card, CardContent } from '@/components/ui/card';
import { formatMatchDate } from '@/lib/format';
import type { FootballMatch } from '@/types/football';
import { cn } from '@/lib/utils';

function formatScore(match: FootballMatch) {
  const home = match.score?.fullTime?.home;
  const away = match.score?.fullTime?.away;
  if (home == null || away == null) return null;
  return `${home} – ${away}`;
}

function TeamCrest({ team }: { team: FootballMatch['homeTeam'] }) {
  if (!team.crest) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {(team.shortName ?? team.name).slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={team.crest}
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 object-contain"
      loading="lazy"
    />
  );
}

interface MatchCardProps {
  match: FootballMatch;
  onSelect?: () => void;
  className?: string;
}

export function MatchCard({ match, onSelect, className }: MatchCardProps) {
  const date = formatMatchDate(match.utcDate);
  const score = formatScore(match);

  const content = (
    <Card className={cn('transition-colors', onSelect && 'hover:border-primary/40', className)}>
      <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <TeamCrest team={match.homeTeam} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium sm:text-base">{match.homeTeam.name}</p>
            <p className="truncate text-sm text-muted-foreground sm:text-base">{match.awayTeam.name}</p>
          </div>
          <TeamCrest team={match.awayTeam} />
        </div>

        <div className="shrink-0 text-right">
          {score ? (
            <p className="text-sm font-semibold tabular-nums sm:text-base">{score}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Sin marcador</p>
          )}
          {date ? <p className="mt-0.5 text-xs text-muted-foreground">{date}</p> : null}
          {match.competition?.name ? (
            <p className="mt-0.5 max-w-28 truncate text-xs text-primary">{match.competition.name}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!onSelect) return content;

  return (
    <button type="button" onClick={onSelect} className="w-full text-left">
      {content}
    </button>
  );
}

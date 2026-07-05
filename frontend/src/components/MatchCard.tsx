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

function matchSummary(match: FootballMatch) {
  const score = formatScore(match);
  const date = formatMatchDate(match.utcDate);
  const parts = [match.homeTeam.name, 'contra', match.awayTeam.name];
  if (score) parts.push(score);
  if (date) parts.push(date);
  if (match.competition?.name) parts.push(match.competition.name);
  return parts.join(', ');
}

function TeamCrest({ team }: { team: FootballMatch['homeTeam'] }) {
  const label = team.shortName ?? team.name;

  if (!team.crest) {
    return (
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
        aria-hidden
      >
        {label.slice(0, 2).toUpperCase()}
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
  const summary = matchSummary(match);

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
            <p className="text-sm font-semibold tabular-nums sm:text-base" aria-label={`Resultado ${score}`}>
              {score}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Sin marcador</p>
          )}
          {date ? (
            <time className="mt-0.5 block text-xs text-muted-foreground" dateTime={match.utcDate}>
              {date}
            </time>
          ) : null}
          {match.competition?.name ? (
            <p className="mt-0.5 max-w-28 truncate text-xs text-primary">{match.competition.name}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!onSelect) {
    return (
      <article aria-label={summary}>
        {content}
      </article>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`Guardar partido: ${summary}`}
    >
      {content}
    </button>
  );
}

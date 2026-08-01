import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { StarRating } from '@/components/StarRating';
import { WatchContextBadge } from '@/components/WatchContextBadge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCapsuleScore, formatWatchedDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Capsule } from '@/types/capsule';

type CapsuleListCardProps = {
  capsule: Capsule;
  header?: ReactNode;
  /** Badges extra junto al contexto (p. ej. «Privada»). */
  badges?: ReactNode;
  showWatchedDate?: boolean;
  competitionTone?: 'primary' | 'muted';
  photoClassName?: string;
  footer?: ReactNode;
  footerBordered?: boolean;
};

export function CapsuleListCard({
  capsule,
  header,
  badges,
  showWatchedDate = false,
  competitionTone = 'primary',
  photoClassName = 'mb-4',
  footer,
  footerBordered = false,
}: CapsuleListCardProps) {
  const score = formatCapsuleScore(capsule.home_score, capsule.away_score);

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        {header}

        <CapsulePhotoGallery
          capsule={capsule}
          alt={`Foto del partido ${capsule.home_team_name} vs ${capsule.away_team_name}`}
          className={photoClassName}
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/c/${capsule.id}`}
                className="font-medium hover:text-primary hover:underline"
              >
                {capsule.home_team_name}
              </Link>
              <WatchContextBadge context={capsule.watch_context} />
              {badges}
            </div>
            <p className="text-muted-foreground">{capsule.away_team_name}</p>
            {capsule.competition_name ? (
              <p
                className={cn(
                  'mt-1 text-xs',
                  competitionTone === 'primary' ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {capsule.competition_name}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            {score ? <p className="font-semibold tabular-nums">{score}</p> : null}
            {showWatchedDate ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Visto {formatWatchedDate(capsule.watched_at)}
              </p>
            ) : null}
          </div>
        </div>

        {capsule.rating ? (
          <div className="mt-3">
            <StarRating rating={capsule.rating} />
          </div>
        ) : null}

        {capsule.note ? <p className="mt-3 text-sm text-muted-foreground">{capsule.note}</p> : null}

        {footer ? (
          <div
            className={cn(
              'mt-4 flex flex-wrap gap-2',
              footerBordered && 'items-start gap-1 border-t border-border pt-3',
            )}
          >
            {footer}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

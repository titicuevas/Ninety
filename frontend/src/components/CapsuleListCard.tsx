import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CapsuleNoteText } from '@/components/CapsuleNoteText';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { CapsuleTagsList } from '@/components/CapsuleTags';
import { StarRating } from '@/components/StarRating';
import { WatchContextBadge } from '@/components/WatchContextBadge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCapsuleScore, formatWatchedDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Capsule } from '@/types/capsule';

/** Lista de Capsules: 1 col en móvil, 2 en tablet/desktop. */
export const capsuleCardListClass = 'grid grid-cols-1 gap-3 md:grid-cols-2';

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
  /** Destino del detalle; por defecto `/c/:id`. */
  detailHref?: string;
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
  detailHref,
}: CapsuleListCardProps) {
  const href = detailHref ?? `/c/${capsule.id}`;
  const score = formatCapsuleScore(capsule.home_score, capsule.away_score);
  const matchLabel = `Ver Capsule: ${capsule.home_team_name} vs ${capsule.away_team_name}`;

  return (
    <Card className="transition-colors has-[[data-capsule-detail]:hover]:border-primary/30 has-[[data-capsule-detail]:focus-visible]:border-primary/30">
      <CardContent className="p-4 sm:p-5">
        {header}

        <CapsulePhotoGallery
          capsule={capsule}
          alt={`Foto del partido ${capsule.home_team_name} vs ${capsule.away_team_name}`}
          className={photoClassName}
        />

        <Link
          to={href}
          data-capsule-detail
          aria-label={matchLabel}
          className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">
                <span className="hover:text-primary">{capsule.home_team_name}</span>
                <span className="text-muted-foreground"> vs </span>
                <span className="text-muted-foreground hover:text-primary">
                  {capsule.away_team_name}
                </span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <WatchContextBadge context={capsule.watch_context} />
                {badges}
              </div>
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

          {capsule.note ? <CapsuleNoteText note={capsule.note} compact /> : null}

          <CapsuleTagsList tags={capsule.tags} compact />
        </Link>

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

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CapsuleNoteText } from '@/components/CapsuleNoteText';
import { CapsulePhotoGallery } from '@/components/CapsulePhotoGallery';
import { CapsuleTagsList } from '@/components/CapsuleTags';
import { CapsuleTicket } from '@/components/CapsuleTicket';
import { StarRating } from '@/components/StarRating';
import { Card, CardContent } from '@/components/ui/card';
import { getCapsulePhotoUrls } from '@/lib/capsulePhotos';
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
  footer,
  footerBordered = false,
  detailHref,
}: CapsuleListCardProps) {
  const href = detailHref ?? `/c/${capsule.id}`;
  const matchLabel = `Ver Capsule: ${capsule.home_team_name} vs ${capsule.away_team_name}`;
  const hasPhotos = getCapsulePhotoUrls(capsule).length > 0;

  return (
    <Card className="motion-card overflow-hidden transition-colors has-[[data-capsule-detail]:hover]:border-primary/30 has-[[data-capsule-detail]:focus-visible]:border-primary/30">
      <CardContent className="p-0">
        {header ? <div className="px-4 pt-4 sm:px-5 sm:pt-5">{header}</div> : null}

        {hasPhotos ? (
          <CapsulePhotoGallery
            capsule={capsule}
            alt={`Foto del partido ${capsule.home_team_name} vs ${capsule.away_team_name}`}
            layout="hero"
            className={cn(header ? 'mt-3' : null)}
          />
        ) : null}

        <div className="p-4 sm:p-5">
          <Link
            to={href}
            data-capsule-detail
            aria-label={matchLabel}
            className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CapsuleTicket
              capsule={capsule}
              showWatchedDate={showWatchedDate}
              competitionTone={competitionTone}
              badges={badges}
            />

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
        </div>
      </CardContent>
    </Card>
  );
}

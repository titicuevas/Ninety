import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CapsuleComments } from '@/components/CapsuleComments';
import { CapsuleLikeButton } from '@/components/CapsuleLikeButton';
import { CapsuleLikersDialog } from '@/components/CapsuleLikersDialog';
import { ShareCapsuleButton } from '@/components/ShareCapsuleButton';
import { useAuthReturnLinks } from '@/hooks/useAuthReturnLinks';
import { formatLikesPanelTitle } from '@/lib/capsuleLikes';
import type { CapsuleShareSummary } from '@/lib/capsuleShare';
import { formatCommentsCountLabel } from '@/lib/commentsCount';
import { cn } from '@/lib/utils';

type CapsuleEngagementBarProps = {
  capsuleId: string;
  shareTitle: string;
  share?: CapsuleShareSummary;
  likesCount?: number;
  likedByMe?: boolean;
  commentsCount?: number;
  currentUserId?: string;
  capsuleOwnerId?: string;
  isPublic?: boolean;
  defaultOpenComments?: boolean;
  className?: string;
  /** Sin borde superior (p. ej. si el padre ya lo aporta). */
  bordered?: boolean;
  /** Incluye botón de compartir (false si ya está en el header). */
  showShare?: boolean;
};

/** Like + comentarios + compartir, con CTA de login coherente para invitados. */
export function CapsuleEngagementBar({
  capsuleId,
  shareTitle,
  share,
  likesCount = 0,
  likedByMe,
  commentsCount = 0,
  currentUserId,
  capsuleOwnerId,
  isPublic = true,
  defaultOpenComments = false,
  className,
  bordered = true,
  showShare = true,
}: CapsuleEngagementBarProps) {
  const [guestLikersOpen, setGuestLikersOpen] = useState(false);
  const { loginTo } = useAuthReturnLinks();

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-start gap-1',
        bordered && 'mt-4 border-t border-border pt-3',
        className,
      )}
    >
      {currentUserId ? (
        <CapsuleLikeButton
          capsuleId={capsuleId}
          likesCount={likesCount}
          likedByMe={likedByMe}
        />
      ) : null}

      <CapsuleComments
        key={defaultOpenComments ? `comments-open-${capsuleId}` : `comments-${capsuleId}`}
        capsuleId={capsuleId}
        commentsCount={commentsCount}
        currentUserId={currentUserId}
        capsuleOwnerId={capsuleOwnerId}
        defaultOpen={defaultOpenComments}
      />

      {!currentUserId ? (
        <p className="w-full text-sm text-muted-foreground">
          {likesCount > 0 ? (
            <button
              type="button"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setGuestLikersOpen(true)}
            >
              {formatLikesPanelTitle(likesCount)}
            </button>
          ) : null}
          {likesCount > 0 && commentsCount > 0 ? ' · ' : null}
          {commentsCount > 0 ? formatCommentsCountLabel(commentsCount) : null}
          {(likesCount > 0 || commentsCount > 0) && ' · '}
          <Link to={loginTo} className="text-primary hover:underline">
            Inicia sesión para interactuar
          </Link>
        </p>
      ) : null}

      {showShare ? (
        <ShareCapsuleButton
          capsuleId={capsuleId}
          title={shareTitle}
          share={share}
          isPublic={isPublic}
        />
      ) : null}

      {!currentUserId ? (
        <CapsuleLikersDialog
          open={guestLikersOpen}
          capsuleId={capsuleId}
          likesCount={likesCount}
          onClose={() => setGuestLikersOpen(false)}
        />
      ) : null}
    </div>
  );
}

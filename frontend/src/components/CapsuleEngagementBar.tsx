import { Link } from 'react-router-dom';
import { CapsuleComments } from '@/components/CapsuleComments';
import { CapsuleLikeButton } from '@/components/CapsuleLikeButton';
import { ShareCapsuleButton } from '@/components/ShareCapsuleButton';
import { cn } from '@/lib/utils';

type CapsuleEngagementBarProps = {
  capsuleId: string;
  shareTitle: string;
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
          {likesCount > 0 ? `${likesCount} me gusta` : null}
          {likesCount > 0 && commentsCount > 0 ? ' · ' : null}
          {commentsCount > 0 ? `${commentsCount} comentarios` : null}
          {(likesCount > 0 || commentsCount > 0) && ' · '}
          <Link to="/login" className="text-primary hover:underline">
            Inicia sesión para interactuar
          </Link>
        </p>
      ) : null}

      {showShare ? (
        <ShareCapsuleButton capsuleId={capsuleId} title={shareTitle} isPublic={isPublic} />
      ) : null}
    </div>
  );
}

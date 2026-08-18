import { CapsuleAlsoCommented } from '@/components/CapsuleAlsoCommented';
import { CapsuleAlsoLiked } from '@/components/CapsuleAlsoLiked';
import { CapsuleAlsoWatched } from '@/components/CapsuleAlsoWatched';
import { CapsuleEngagementBar } from '@/components/CapsuleEngagementBar';
import type { AlsoWatchedPerson } from '@/lib/capsuleAlsoWatched';
import type { CapsuleShareSummary } from '@/lib/capsuleShare';
import { cn } from '@/lib/utils';

type CapsuleCardSocialFooterProps = {
  capsuleId: string;
  capsuleOwnerId: string;
  currentUserId?: string;
  likesCount?: number;
  likedByMe?: boolean;
  commentsCount?: number;
  alsoWatched?: AlsoWatchedPerson[];
  shareTitle?: string;
  share?: CapsuleShareSummary;
  isPublic?: boolean;
  showShare?: boolean;
  showBar?: boolean;
  className?: string;
};

/** Likes/comentarios de follows + barra de engagement (diario público y feed). */
export function CapsuleCardSocialFooter({
  capsuleId,
  capsuleOwnerId,
  currentUserId,
  likesCount = 0,
  likedByMe,
  commentsCount = 0,
  alsoWatched,
  shareTitle = '',
  share,
  isPublic = true,
  showShare = true,
  showBar = true,
  className,
}: CapsuleCardSocialFooterProps) {
  const alsoWatchedLine =
    currentUserId && (alsoWatched?.length ?? 0) > 0 ? (
      <CapsuleAlsoWatched people={alsoWatched} exceptUserId={capsuleOwnerId} />
    ) : null;
  const alsoLiked =
    currentUserId && likesCount > 0 ? (
      <CapsuleAlsoLiked capsuleId={capsuleId} exceptUserId={capsuleOwnerId} />
    ) : null;
  const alsoCommented =
    currentUserId && commentsCount > 0 ? (
      <CapsuleAlsoCommented capsuleId={capsuleId} exceptUserId={capsuleOwnerId} />
    ) : null;

  if (!showBar && !alsoWatchedLine && (!currentUserId || (likesCount < 1 && commentsCount < 1))) {
    return null;
  }

  return (
    <div className={cn('w-full space-y-2', className)}>
      {alsoWatchedLine}
      {alsoLiked}
      {alsoCommented}
      {showBar ? (
        <CapsuleEngagementBar
          bordered={false}
          className="mt-0"
          capsuleId={capsuleId}
          shareTitle={shareTitle}
          share={share}
          likesCount={likesCount}
          likedByMe={likedByMe}
          commentsCount={commentsCount}
          currentUserId={currentUserId}
          capsuleOwnerId={capsuleOwnerId}
          isPublic={isPublic}
          showShare={showShare}
        />
      ) : null}
    </div>
  );
}

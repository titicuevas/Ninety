import { CapsuleAlsoCommented } from '@/components/CapsuleAlsoCommented';
import { CapsuleAlsoLiked } from '@/components/CapsuleAlsoLiked';
import { CapsuleAlsoWatched } from '@/components/CapsuleAlsoWatched';
import { CapsuleEngagementBar } from '@/components/CapsuleEngagementBar';
import { SocialInlineRow } from '@/components/SocialInlineRow';
import type { AlsoWatchedPerson } from '@/lib/capsuleAlsoWatched';
import type { CapsuleShareSummary } from '@/lib/capsuleShare';
import type { CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';
import { cn } from '@/lib/utils';

type CapsuleCardSocialFooterProps = {
  capsuleId: string;
  capsuleOwnerId: string;
  currentUserId?: string;
  likesCount?: number;
  likedByMe?: boolean;
  commentsCount?: number;
  alsoWatched?: AlsoWatchedPerson[];
  alsoLiked?: CollectionAlsoLikedPerson[];
  alsoCommented?: CollectionAlsoLikedPerson[];
  shareTitle?: string;
  share?: CapsuleShareSummary;
  isPublic?: boolean;
  showShare?: boolean;
  showBar?: boolean;
  defaultOpenComments?: boolean;
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
  alsoLiked,
  alsoCommented,
  shareTitle = '',
  share,
  isPublic = true,
  showShare = true,
  showBar = true,
  defaultOpenComments = false,
  className,
}: CapsuleCardSocialFooterProps) {
  const showAlso = Boolean(
    currentUserId &&
      ((alsoWatched?.length ?? 0) > 0 ||
        likesCount > 0 ||
        commentsCount > 0 ||
        alsoLiked !== undefined ||
        alsoCommented !== undefined),
  );

  if (!showBar && !showAlso) return null;
  if (
    !showBar &&
    (alsoWatched?.length ?? 0) === 0 &&
    likesCount < 1 &&
    commentsCount < 1
  ) {
    return null;
  }

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      {showAlso ? (
        <SocialInlineRow>
          {(alsoWatched?.length ?? 0) > 0 ? (
            <CapsuleAlsoWatched people={alsoWatched} exceptUserId={capsuleOwnerId} />
          ) : null}
          {likesCount > 0 || alsoLiked !== undefined ? (
            <CapsuleAlsoLiked
              capsuleId={capsuleId}
              people={alsoLiked}
              exceptUserId={capsuleOwnerId}
            />
          ) : null}
          {commentsCount > 0 || alsoCommented !== undefined ? (
            <CapsuleAlsoCommented
              capsuleId={capsuleId}
              people={alsoCommented}
              exceptUserId={capsuleOwnerId}
            />
          ) : null}
        </SocialInlineRow>
      ) : null}
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
          defaultOpenComments={defaultOpenComments}
        />
      ) : null}
    </div>
  );
}

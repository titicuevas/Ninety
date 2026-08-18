import { CapsuleAlsoCommented } from '@/components/CapsuleAlsoCommented';
import { CapsuleAlsoLiked } from '@/components/CapsuleAlsoLiked';
import { CapsuleEngagementBar } from '@/components/CapsuleEngagementBar';
import type { CapsuleShareSummary } from '@/lib/capsuleShare';

type CapsuleCardSocialFooterProps = {
  capsuleId: string;
  capsuleOwnerId: string;
  currentUserId?: string;
  likesCount?: number;
  likedByMe?: boolean;
  commentsCount?: number;
  shareTitle: string;
  share?: CapsuleShareSummary;
  isPublic?: boolean;
  showShare?: boolean;
};

/** Likes/comentarios de follows + barra de engagement (diario público y feed). */
export function CapsuleCardSocialFooter({
  capsuleId,
  capsuleOwnerId,
  currentUserId,
  likesCount = 0,
  likedByMe,
  commentsCount = 0,
  shareTitle,
  share,
  isPublic = true,
  showShare = true,
}: CapsuleCardSocialFooterProps) {
  return (
    <div className="w-full space-y-2">
      {currentUserId ? (
        <>
          {likesCount > 0 ? (
            <CapsuleAlsoLiked capsuleId={capsuleId} exceptUserId={capsuleOwnerId} />
          ) : null}
          {commentsCount > 0 ? (
            <CapsuleAlsoCommented capsuleId={capsuleId} exceptUserId={capsuleOwnerId} />
          ) : null}
        </>
      ) : null}
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
    </div>
  );
}

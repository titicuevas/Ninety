import { CollectionAlsoCommented } from '@/components/CollectionAlsoCommented';
import { CollectionAlsoLiked } from '@/components/CollectionAlsoLiked';
import type { CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';

type CollectionCardSocialFooterProps = {
  collectionId: string;
  ownerId: string;
  currentUserId?: string;
  likesCount?: number;
  commentsCount?: number;
  alsoLiked?: CollectionAlsoLikedPerson[];
  alsoCommented?: CollectionAlsoLikedPerson[];
  className?: string;
};

/** «También le gusta / comentó» en tarjetas de listas (Explorar, feed, me gusta, Mis listas). */
export function CollectionCardSocialFooter({
  collectionId,
  ownerId,
  currentUserId,
  likesCount = 0,
  commentsCount = 0,
  alsoLiked,
  alsoCommented,
  className,
}: CollectionCardSocialFooterProps) {
  if (!currentUserId || (likesCount < 1 && commentsCount < 1 && alsoLiked === undefined)) {
    return null;
  }

  return (
    <div className={className ?? 'space-y-1'}>
      {likesCount > 0 || alsoLiked !== undefined ? (
        <CollectionAlsoLiked
          collectionId={collectionId}
          people={alsoLiked}
          exceptUserId={ownerId}
        />
      ) : null}
      {commentsCount > 0 || alsoCommented !== undefined ? (
        <CollectionAlsoCommented
          collectionId={collectionId}
          people={alsoCommented}
          exceptUserId={ownerId}
        />
      ) : null}
    </div>
  );
}

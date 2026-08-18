import { CollectionAlsoCommented } from '@/components/CollectionAlsoCommented';
import { CollectionAlsoLiked } from '@/components/CollectionAlsoLiked';

type CollectionCardSocialFooterProps = {
  collectionId: string;
  ownerId: string;
  currentUserId?: string;
  likesCount?: number;
  commentsCount?: number;
  className?: string;
};

/** «También le gusta / comentó» en tarjetas de listas (Explorar, feed, me gusta, Mis listas). */
export function CollectionCardSocialFooter({
  collectionId,
  ownerId,
  currentUserId,
  likesCount = 0,
  commentsCount = 0,
  className,
}: CollectionCardSocialFooterProps) {
  if (!currentUserId || (likesCount < 1 && commentsCount < 1)) return null;

  return (
    <div className={className ?? 'space-y-1'}>
      {likesCount > 0 ? (
        <CollectionAlsoLiked collectionId={collectionId} exceptUserId={ownerId} />
      ) : null}
      {commentsCount > 0 ? (
        <CollectionAlsoCommented collectionId={collectionId} exceptUserId={ownerId} />
      ) : null}
    </div>
  );
}

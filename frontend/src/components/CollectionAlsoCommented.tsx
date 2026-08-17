import { AlsoLikedPeople } from '@/components/AlsoLikedPeople';
import { useCollectionAlsoCommented } from '@/hooks/useCollectionAlsoCommented';
import { alsoCommentedLabel } from '@/lib/capsuleAlsoCommented';
import { filterAlsoLikedPeople } from '@/lib/collectionAlsoLiked';

export function CollectionAlsoCommented({
  collectionId,
  exceptUserId,
  className,
}: {
  collectionId: string;
  exceptUserId?: string | null;
  className?: string;
}) {
  const { data, isLoading, isError } = useCollectionAlsoCommented(collectionId);
  const people = filterAlsoLikedPeople(data?.people ?? [], exceptUserId);

  if (isLoading || isError || people.length === 0) return null;

  return (
    <AlsoLikedPeople
      people={people}
      className={className}
      label={alsoCommentedLabel(people.length)}
      ariaLabel="También comentaron personas que sigues"
    />
  );
}

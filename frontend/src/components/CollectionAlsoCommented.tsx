import { AlsoLikedPeople } from '@/components/AlsoLikedPeople';
import { useCollectionAlsoCommented } from '@/hooks/useCollectionAlsoCommented';
import { alsoCommentedLabel } from '@/lib/capsuleAlsoCommented';
import { filterAlsoLikedPeople, type CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';

export function CollectionAlsoCommented({
  collectionId,
  people: peopleProp,
  exceptUserId,
  className,
}: {
  collectionId?: string;
  people?: CollectionAlsoLikedPerson[];
  exceptUserId?: string | null;
  className?: string;
}) {
  const shouldFetch = peopleProp === undefined;
  const { data, isLoading, isError } = useCollectionAlsoCommented(
    shouldFetch ? collectionId : undefined,
  );
  const people = filterAlsoLikedPeople(peopleProp ?? data?.people ?? [], exceptUserId);

  if (shouldFetch && (isLoading || isError)) return null;
  if (people.length === 0) return null;

  return (
    <AlsoLikedPeople
      people={people}
      className={className}
      label={alsoCommentedLabel(people.length)}
      ariaLabel="También comentaron personas que sigues"
    />
  );
}

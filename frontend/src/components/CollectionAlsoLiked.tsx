import { AlsoLikedPeople } from '@/components/AlsoLikedPeople';
import { useCollectionAlsoLiked } from '@/hooks/useCollectionAlsoLiked';
import { filterAlsoLikedPeople, type CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';

export function CollectionAlsoLiked({
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
  const { data, isLoading, isError } = useCollectionAlsoLiked(shouldFetch ? collectionId : undefined);
  const people = filterAlsoLikedPeople(peopleProp ?? data?.people ?? [], exceptUserId);

  if (shouldFetch && (isLoading || isError)) return null;
  if (people.length === 0) return null;

  return <AlsoLikedPeople people={people} className={className} />;
}

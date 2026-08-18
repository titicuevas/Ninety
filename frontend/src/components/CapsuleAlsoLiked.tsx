import { AlsoLikedPeople } from '@/components/AlsoLikedPeople';
import { useCapsuleAlsoLiked } from '@/hooks/useCapsuleAlsoLiked';
import { filterAlsoLikedPeople, type CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';

export function CapsuleAlsoLiked({
  capsuleId,
  people: peopleProp,
  exceptUserId,
  className,
}: {
  capsuleId?: string;
  people?: CollectionAlsoLikedPerson[];
  exceptUserId?: string | null;
  className?: string;
}) {
  const shouldFetch = peopleProp === undefined;
  const { data, isLoading, isError } = useCapsuleAlsoLiked(shouldFetch ? capsuleId : undefined);
  const people = filterAlsoLikedPeople(peopleProp ?? data?.people ?? [], exceptUserId);

  if (shouldFetch && (isLoading || isError)) return null;
  if (people.length === 0) return null;

  return <AlsoLikedPeople people={people} className={className} />;
}

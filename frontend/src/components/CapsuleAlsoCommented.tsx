import { AlsoLikedPeople } from '@/components/AlsoLikedPeople';
import { useCapsuleAlsoCommented } from '@/hooks/useCapsuleAlsoCommented';
import { alsoCommentedLabel } from '@/lib/capsuleAlsoCommented';
import { filterAlsoLikedPeople, type CollectionAlsoLikedPerson } from '@/lib/collectionAlsoLiked';

export function CapsuleAlsoCommented({
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
  const { data, isLoading, isError } = useCapsuleAlsoCommented(shouldFetch ? capsuleId : undefined);
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

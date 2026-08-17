import { AlsoLikedPeople } from '@/components/AlsoLikedPeople';
import { useCapsuleAlsoCommented } from '@/hooks/useCapsuleAlsoCommented';
import { alsoCommentedLabel } from '@/lib/capsuleAlsoCommented';
import { filterAlsoLikedPeople } from '@/lib/collectionAlsoLiked';

export function CapsuleAlsoCommented({
  capsuleId,
  exceptUserId,
  className,
}: {
  capsuleId: string;
  exceptUserId?: string | null;
  className?: string;
}) {
  const { data, isLoading, isError } = useCapsuleAlsoCommented(capsuleId);
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

import { AlsoLikedPeople } from '@/components/AlsoLikedPeople';
import { useCapsuleAlsoLiked } from '@/hooks/useCapsuleAlsoLiked';
import { filterAlsoLikedPeople } from '@/lib/collectionAlsoLiked';

export function CapsuleAlsoLiked({
  capsuleId,
  exceptUserId,
  className,
}: {
  capsuleId: string;
  exceptUserId?: string | null;
  className?: string;
}) {
  const { data, isLoading, isError } = useCapsuleAlsoLiked(capsuleId);
  const people = filterAlsoLikedPeople(data?.people ?? [], exceptUserId);

  if (isLoading || isError || people.length === 0) return null;

  return <AlsoLikedPeople people={people} className={className} />;
}

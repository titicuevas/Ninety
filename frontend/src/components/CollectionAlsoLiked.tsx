import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useCollectionAlsoLiked } from '@/hooks/useCollectionAlsoLiked';
import { alsoLikedLabel, filterAlsoLikedPeople } from '@/lib/collectionAlsoLiked';
import { isAutoUsername } from '@/lib/profileHelpers';
import { publicProfilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';

export function CollectionAlsoLiked({
  collectionId,
  exceptUserId,
  className,
}: {
  collectionId: string;
  exceptUserId?: string | null;
  className?: string;
}) {
  const { data, isLoading, isError } = useCollectionAlsoLiked(collectionId);
  const people = filterAlsoLikedPeople(data?.people ?? [], exceptUserId);

  if (isLoading || isError || people.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground',
        className,
      )}
      aria-label="También les gusta a personas que sigues"
    >
      <Users className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span>
        {alsoLikedLabel(people.length)}:{' '}
        {people.map((person, index) => {
          const name = person.display_name ?? person.username ?? 'Aficionado';
          const href =
            person.username && !isAutoUsername(person.username)
              ? publicProfilePath(person.username)
              : null;
          return (
            <span key={person.id}>
              {index > 0 ? ', ' : null}
              {href ? (
                <Link to={href} className="font-medium text-primary hover:underline">
                  {name}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{name}</span>
              )}
            </span>
          );
        })}
      </span>
    </div>
  );
}

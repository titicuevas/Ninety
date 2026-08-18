import { Link } from 'react-router-dom';
import { useCapsuleAlsoWatched } from '@/hooks/useCapsuleAlsoWatched';
import { alsoWatchedLabel, filterAlsoWatchedPeople, type AlsoWatchedPerson } from '@/lib/capsuleAlsoWatched';
import { cn } from '@/lib/utils';

export function CapsuleAlsoWatched({
  matchId,
  people: peopleProp,
  exceptUserId,
  className,
}: {
  matchId?: number;
  people?: AlsoWatchedPerson[];
  exceptUserId?: string | null;
  className?: string;
}) {
  const shouldFetch = peopleProp === undefined;
  const { data, isLoading, isError } = useCapsuleAlsoWatched(shouldFetch ? matchId : undefined);
  const people = filterAlsoWatchedPeople(peopleProp ?? data?.people ?? [], exceptUserId);

  if (shouldFetch && (isLoading || isError)) return null;
  if (people.length === 0) return null;

  return (
    <span
      className={cn('text-xs text-muted-foreground', className)}
      aria-label="También lo vieron personas que sigues"
    >
      {alsoWatchedLabel(people.length)}:{' '}
      {people.map((person, index) => {
        const name = person.display_name ?? person.username ?? 'Aficionado';
        return (
          <span key={person.id}>
            {index > 0 ? ', ' : null}
            <Link
              to={`/c/${encodeURIComponent(person.capsule_id)}`}
              className="font-medium text-primary hover:underline"
            >
              {name}
            </Link>
          </span>
        );
      })}
    </span>
  );
}

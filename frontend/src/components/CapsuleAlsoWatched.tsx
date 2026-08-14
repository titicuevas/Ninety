import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useCapsuleAlsoWatched } from '@/hooks/useCapsuleAlsoWatched';
import { alsoWatchedLabel, filterAlsoWatchedPeople } from '@/lib/capsuleAlsoWatched';
import { cn } from '@/lib/utils';

export function CapsuleAlsoWatched({
  matchId,
  exceptUserId,
  className,
}: {
  matchId: number;
  exceptUserId?: string | null;
  className?: string;
}) {
  const { data, isLoading, isError } = useCapsuleAlsoWatched(matchId);
  const people = filterAlsoWatchedPeople(data?.people ?? [], exceptUserId);

  if (isLoading || isError || people.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground',
        className,
      )}
      aria-label="También lo vieron personas que sigues"
    >
      <Users className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span>
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
    </div>
  );
}

import { Link } from 'react-router-dom';
import { alsoLikedLabel } from '@/lib/collectionAlsoLiked';
import { isAutoUsername } from '@/lib/profileHelpers';
import { publicProfilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';

export type AlsoLikedPerson = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function AlsoLikedPeople({
  people,
  className,
  label,
  ariaLabel = 'También les gusta a personas que sigues',
}: {
  people: AlsoLikedPerson[];
  className?: string;
  label?: string;
  ariaLabel?: string;
}) {
  if (people.length === 0) return null;

  return (
    <span className={cn('text-xs text-muted-foreground', className)} aria-label={ariaLabel}>
      {label ?? alsoLikedLabel(people.length)}:{' '}
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
  );
}

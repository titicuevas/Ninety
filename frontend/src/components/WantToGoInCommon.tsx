import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useWantToGoInCommon } from '@/hooks/useWantToGo';
import { isAutoUsername } from '@/lib/profileHelpers';
import { publicProfilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';

export function WantToGoInCommon({
  matchId,
  className,
}: {
  matchId: number;
  className?: string;
}) {
  const { data, isLoading, isError } = useWantToGoInCommon(matchId);
  const profiles = data?.profiles ?? [];

  if (isLoading || isError || profiles.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground',
        className,
      )}
      aria-label="También lo quieren ir personas que sigues"
    >
      <Users className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span>
        También en Quiero ir:{' '}
        {profiles.map((profile, index) => {
          const name = profile.display_name ?? profile.username ?? 'Aficionado';
          const href =
            profile.username && !isAutoUsername(profile.username)
              ? publicProfilePath(profile.username)
              : null;
          return (
            <span key={profile.id}>
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

import { useEffect, useState } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { useToggleFollow } from '@/hooks/useFollowUser';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  username: string;
  followedByMe?: boolean;
  className?: string;
  /** Compacto para filas de búsqueda / sugerencias. */
  size?: 'default' | 'compact';
}

export function FollowButton({
  username,
  followedByMe = false,
  className,
  size = 'default',
}: FollowButtonProps) {
  const toggle = useToggleFollow(username);
  const [followed, setFollowed] = useState(() => followedByMe);

  useEffect(() => {
    setFollowed(followedByMe);
  }, [followedByMe, username]);

  const handleClick = () => {
    const wasFollowed = followed;
    setFollowed(!wasFollowed);
    toggle.mutate(
      { followed: wasFollowed },
      {
        onError: () => setFollowed(wasFollowed),
      },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggle.isPending}
      aria-pressed={followed}
      aria-busy={toggle.isPending || undefined}
      aria-label={followed ? 'Dejar de seguir' : 'Seguir'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        size === 'default' ? 'min-h-11 w-full gap-2 px-4 py-2 sm:w-auto' : 'px-3 py-1.5',
        followed
          ? 'bg-secondary text-foreground hover:bg-secondary/80'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
        className,
      )}
    >
      {followed ? (
        <>
          <UserMinus className="h-4 w-4 shrink-0" aria-hidden="true" />
          Siguiendo
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
          Seguir
        </>
      )}
    </button>
  );
}

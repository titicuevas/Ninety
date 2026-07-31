import { useEffect, useState } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { useToggleFollow } from '@/hooks/useFollowUser';
import { friendlyApiError } from '@/lib/friendlyErrors';
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
    <div
      className={cn(
        'flex flex-col gap-1',
        size === 'default' ? 'items-stretch sm:items-end' : 'items-end',
      )}
    >
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
          size === 'default' ? 'min-h-11 gap-2 px-4 py-2' : 'px-3 py-1.5',
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
      {toggle.isError ? (
        <p className="max-w-[12rem] text-right text-xs text-destructive">
          {toggle.error instanceof Error
            ? friendlyApiError(toggle.error.message)
            : 'No se pudo actualizar'}
        </p>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { useToggleFollow } from '@/hooks/useFollowUser';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  username: string;
  followedByMe?: boolean;
  className?: string;
}

export function FollowButton({ username, followedByMe = false, className }: FollowButtonProps) {
  const toggle = useToggleFollow(username);
  const [followed, setFollowed] = useState(() => followedByMe);

  useEffect(() => {
    setFollowed(followedByMe);
  }, [followedByMe, username]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() =>
          toggle.mutate(
            { followed },
            {
              onSuccess: () => setFollowed((v) => !v),
            },
          )
        }
        disabled={toggle.isPending}
        aria-pressed={followed}
        aria-label={followed ? 'Dejar de seguir' : 'Seguir'}
        className={cn(
          'inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
          {toggle.error instanceof Error ? toggle.error.message : 'No se pudo actualizar'}
        </p>
      ) : null}
    </div>
  );
}

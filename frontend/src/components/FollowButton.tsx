import { useEffect, useState, type MouseEvent } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { useToggleFollow } from '@/hooks/useFollowUser';
import { followButtonLabel } from '@/lib/followButton';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  username: string;
  followedByMe?: boolean;
  className?: string;
  /** Compacto para filas de búsqueda / sugerencias; `icon` para digest. */
  size?: 'default' | 'compact' | 'icon';
  /** Etiqueta «Seguir de vuelta» (digest de follows). */
  followBack?: boolean;
}

export function FollowButton({
  username,
  followedByMe = false,
  className,
  size = 'default',
  followBack = false,
}: FollowButtonProps) {
  const toggle = useToggleFollow(username);
  const [followed, setFollowed] = useState(() => followedByMe);

  useEffect(() => {
    setFollowed(followedByMe);
  }, [followedByMe, username]);

  const following = toggle.isPending && toggle.variables?.followed === false;
  const unfollowing = toggle.isPending && toggle.variables?.followed === true;
  const label = followButtonLabel({ followed, following, unfollowing, followBack });
  const showUnfollowChrome = unfollowing || (followed && !following);
  const pressed = followed || unfollowing;

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
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
      aria-pressed={pressed}
      aria-busy={toggle.isPending || undefined}
      aria-label={label}
      title={label}
      data-testid={followBack ? 'follow-back-button' : 'follow-button'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-70',
        size === 'default' && 'min-h-11 w-full gap-2 px-4 py-2 sm:w-auto',
        size === 'compact' && 'whitespace-nowrap px-3 py-1.5',
        size === 'icon' && 'h-9 w-9 p-0',
        showUnfollowChrome
          ? 'border border-border bg-secondary text-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
        className,
      )}
    >
      {showUnfollowChrome ? (
        <UserMinus className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {size === 'icon' ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}

import { useState, type MouseEvent } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { useToggleFollow } from '@/hooks/useFollowUser';
import { followButtonLabel } from '@/lib/followButton';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  username: string;
  followedByMe?: boolean;
  /** El perfil te sigue → CTA «Seguir de vuelta» si aún no le sigues. */
  followsMe?: boolean;
  className?: string;
  /** Compacto para filas de búsqueda / sugerencias; `icon` para digest. */
  size?: 'default' | 'compact' | 'icon';
  /** Fuerza etiqueta «Seguir de vuelta» (p. ej. digest de follows). */
  followBack?: boolean;
}

export function FollowButton({
  username,
  followedByMe = false,
  followsMe = false,
  className,
  size = 'default',
  followBack = false,
}: FollowButtonProps) {
  const toggle = useToggleFollow(username);
  const propKey = `${username}:${followedByMe ? 1 : 0}`;
  const [optimistic, setOptimistic] = useState<{ key: string; value: boolean } | null>(null);
  const followed = optimistic?.key === propKey ? optimistic.value : followedByMe;

  const useFollowBack = followBack || (followsMe && !followed);
  const following = toggle.isPending && toggle.variables?.followed === false;
  const unfollowing = toggle.isPending && toggle.variables?.followed === true;
  const label = followButtonLabel({
    followed,
    following,
    unfollowing,
    followBack: useFollowBack,
  });
  const showUnfollowChrome = unfollowing || (followed && !following);
  const pressed = followed || unfollowing;

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const wasFollowed = followed;
    setOptimistic({ key: propKey, value: !wasFollowed });
    toggle.mutate(
      { followed: wasFollowed },
      {
        onError: () => setOptimistic(null),
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
      data-testid={useFollowBack ? 'follow-back-button' : 'follow-button'}
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

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

  return (
    <button
      type="button"
      onClick={() => toggle.mutate({ followed: followedByMe })}
      disabled={toggle.isPending}
      aria-pressed={followedByMe}
      aria-label={followedByMe ? 'Dejar de seguir' : 'Seguir'}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        followedByMe
          ? 'bg-secondary text-foreground hover:bg-secondary/80'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
        className,
      )}
    >
      {followedByMe ? (
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

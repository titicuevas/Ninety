import { useState, type MouseEvent } from 'react';
import { Ban, ShieldOff } from 'lucide-react';
import { useToggleBlockUser } from '@/hooks/useBlockUser';
import { blockUserButtonLabel } from '@/lib/blockUser';
import { cn } from '@/lib/utils';

interface BlockUserButtonProps {
  username: string;
  blockedByMe?: boolean;
  className?: string;
  size?: 'default' | 'compact' | 'icon';
}

export function BlockUserButton({
  username,
  blockedByMe = false,
  className,
  size = 'default',
}: BlockUserButtonProps) {
  const toggle = useToggleBlockUser(username);
  const propKey = `${username}:${blockedByMe ? 1 : 0}`;
  const [optimistic, setOptimistic] = useState<{ key: string; value: boolean } | null>(null);
  const blocked = optimistic?.key === propKey ? optimistic.value : blockedByMe;

  const blocking = toggle.isPending && toggle.variables?.blocked === false;
  const unblocking = toggle.isPending && toggle.variables?.blocked === true;
  const label = blockUserButtonLabel({ blocked, blocking, unblocking });
  const showUnblockChrome = unblocking || (blocked && !blocking);
  const pressed = blocked || unblocking;

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const wasBlocked = blocked;
    setOptimistic({ key: propKey, value: !wasBlocked });
    toggle.mutate(
      { blocked: wasBlocked },
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
      data-testid="block-user-button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-70',
        size === 'default' && 'min-h-11 w-full gap-2 px-4 py-2 sm:w-auto',
        size === 'compact' && 'whitespace-nowrap px-3 py-1.5',
        size === 'icon' && 'h-9 w-9 p-0',
        showUnblockChrome
          ? 'border border-border bg-secondary text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary'
          : 'border border-destructive/40 bg-background text-destructive hover:bg-destructive/10',
        className,
      )}
    >
      {showUnblockChrome ? (
        <ShieldOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {size === 'icon' ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}

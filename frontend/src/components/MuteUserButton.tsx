import { useEffect, useState, type MouseEvent } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useToggleMuteUser } from '@/hooks/useMuteUser';
import { muteUserButtonLabel } from '@/lib/muteUser';
import { cn } from '@/lib/utils';

interface MuteUserButtonProps {
  username: string;
  mutedByMe?: boolean;
  className?: string;
  /** Compacto para filas de alertas. */
  size?: 'default' | 'compact' | 'icon';
}

export function MuteUserButton({
  username,
  mutedByMe = false,
  className,
  size = 'default',
}: MuteUserButtonProps) {
  const toggle = useToggleMuteUser(username);
  const [muted, setMuted] = useState(() => mutedByMe);

  useEffect(() => {
    setMuted(mutedByMe);
  }, [mutedByMe, username]);

  const muting = toggle.isPending && toggle.variables?.muted === false;
  const unmuting = toggle.isPending && toggle.variables?.muted === true;
  const label = muteUserButtonLabel({ muted, muting, unmuting });
  const showUnmuteChrome = unmuting || (muted && !muting);
  const pressed = muted || unmuting;

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const wasMuted = muted;
    setMuted(!wasMuted);
    toggle.mutate(
      { muted: wasMuted },
      {
        onError: () => setMuted(wasMuted),
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
      data-testid="mute-user-button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-70',
        size === 'default' && 'min-h-11 w-full gap-2 px-4 py-2 sm:w-auto',
        size === 'compact' && 'whitespace-nowrap px-3 py-1.5',
        size === 'icon' && 'h-9 w-9 p-0',
        showUnmuteChrome
          ? 'border border-border bg-secondary text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary'
          : 'border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground',
        className,
      )}
    >
      {showUnmuteChrome ? (
        <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <BellOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {size === 'icon' ? <span className="sr-only">{label}</span> : label}
    </button>
  );
}

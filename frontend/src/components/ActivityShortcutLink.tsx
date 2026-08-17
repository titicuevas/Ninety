import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFollowActivityBadgeCount } from '@/hooks/useFollowActivityBadge';
import { activityShortcutAriaLabel, formatActivityBadgeCount } from '@/lib/activityBadge';
import { cn } from '@/lib/utils';

type ActivityShortcutLinkProps = {
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: LucideIcon;
  showLabel?: boolean;
};

/** Atajo a /activity con badge cuando hay eventos de follows. */
export function ActivityShortcutLink({
  className,
  variant = 'secondary',
  size = 'sm',
  icon: Icon = Activity,
  showLabel = true,
}: ActivityShortcutLinkProps) {
  const total = useFollowActivityBadgeCount();
  const badge = formatActivityBadgeCount(total);

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link to="/activity" aria-label={activityShortcutAriaLabel(total)}>
        <span className="relative inline-flex">
          <Icon className={cn('h-3.5 w-3.5', showLabel && 'sm:mr-1.5')} aria-hidden />
          {badge ? (
            <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
              {badge}
            </span>
          ) : null}
        </span>
        {showLabel ? <span className="sr-only sm:not-sr-only">Actividad</span> : null}
      </Link>
    </Button>
  );
}

import { NavLink } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useFollowActivityBadgeCount } from '@/hooks/useFollowActivityBadge';
import { activityShortcutAriaLabel, formatActivityBadgeCount } from '@/lib/activityBadge';
import { cn } from '@/lib/utils';

type ActivityNavLinkProps = {
  className?: string;
  /** Icono compacto en header móvil (sin etiqueta). */
  compact?: boolean;
  /** Clases cuando la ruta está activa (nav desktop). */
  activeClassName?: string;
  inactiveClassName?: string;
};

function ActivityCountBadge({ label }: { label: string }) {
  return (
    <span
      className="pointer-events-none absolute -right-2 -top-2 z-[1] flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold tabular-nums leading-none text-primary-foreground shadow-sm ring-2 ring-background"
      aria-hidden
    >
      {label}
    </span>
  );
}

export function ActivityNavLink({
  className,
  compact = false,
  activeClassName,
  inactiveClassName,
}: ActivityNavLinkProps) {
  const total = useFollowActivityBadgeCount();
  const badge = formatActivityBadgeCount(total);

  return (
    <NavLink
      to="/activity"
      end
      className={({ isActive }) =>
        cn(
          !compact && 'gap-1.5',
          className,
          isActive ? activeClassName : inactiveClassName,
        )
      }
      aria-label={activityShortcutAriaLabel(total)}
    >
      <span className="relative inline-flex shrink-0">
        <Activity className={cn(compact ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden />
        {badge ? <ActivityCountBadge label={badge} /> : null}
      </span>
      {!compact ? <span>Actividad</span> : null}
    </NavLink>
  );
}

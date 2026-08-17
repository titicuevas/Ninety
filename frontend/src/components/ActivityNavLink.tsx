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
          className,
          isActive ? activeClassName : inactiveClassName,
        )
      }
      aria-label={activityShortcutAriaLabel(total)}
    >
      <span className={cn('relative inline-flex', !compact && 'gap-1.5')}>
        <Activity className={cn('shrink-0', compact ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden />
        {badge ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
            {badge}
          </span>
        ) : null}
        {!compact ? <span>Actividad</span> : null}
      </span>
    </NavLink>
  );
}

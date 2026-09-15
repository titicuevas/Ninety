import { NavLink } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityNavLinkProps = {
  className?: string;
  /** Icono compacto en header móvil (sin etiqueta). */
  compact?: boolean;
  /** Clases cuando la ruta está activa (nav desktop). */
  activeClassName?: string;
  inactiveClassName?: string;
  /** Clases de la etiqueta visible (p. ej. ocultar hasta xl). */
  labelClassName?: string;
};

/** Enlace a Actividad sin badge de total (el contador total era ruido tipo «9+»). */
export function ActivityNavLink({
  className,
  compact = false,
  activeClassName,
  inactiveClassName,
  labelClassName,
}: ActivityNavLinkProps) {
  return (
    <NavLink
      to="/activity"
      end
      title="Actividad"
      className={({ isActive }) =>
        cn(
          !compact && 'gap-1.5',
          className,
          isActive ? activeClassName : inactiveClassName,
        )
      }
      aria-label="Actividad"
    >
      <Activity className={cn(compact ? 'h-5 w-5' : 'h-4 w-4')} aria-hidden />
      {!compact ? <span className={labelClassName}>Actividad</span> : null}
    </NavLink>
  );
}

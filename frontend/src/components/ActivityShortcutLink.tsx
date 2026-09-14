import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActivityShortcutLinkProps = {
  className?: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: LucideIcon;
  showLabel?: boolean;
};

/** Atajo a /activity (sin badge de total: el «9+» era ruido, no sin leer). */
export function ActivityShortcutLink({
  className,
  variant = 'secondary',
  size = 'sm',
  icon: Icon = Activity,
  showLabel = true,
}: ActivityShortcutLinkProps) {
  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link to="/activity" aria-label="Actividad">
        <Icon className={cn('h-3.5 w-3.5', showLabel && 'sm:mr-1.5')} aria-hidden />
        {showLabel ? <span className="sr-only sm:not-sr-only">Actividad</span> : null}
      </Link>
    </Button>
  );
}

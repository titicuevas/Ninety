import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Chip de filtro reutilizable (Mis Capsules, perfil público, Buscar). */
export function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-10 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

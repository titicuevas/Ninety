import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Fila de chips: scroll horizontal en móvil, wrap a partir de tablet. */
export const filterChipRowClass =
  'flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:thin] md:flex-wrap md:overflow-visible';

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
      aria-pressed={active}
      className={cn(
        'min-h-10 shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-[color,background-color,transform]',
        'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-foreground/80 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

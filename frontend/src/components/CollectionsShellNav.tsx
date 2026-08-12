import { NavLink, useLocation } from 'react-router-dom';
import { Compass, Library } from 'lucide-react';
import {
  isCollectionsExplorePath,
  isCollectionsMinePath,
  isCollectionsSectionPath,
} from '@/lib/collectionsNav';
import { cn } from '@/lib/utils';

const TAB_CLASS =
  'inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none';

/**
 * Subnav del shell: Mis listas / Explorar cuando estás en la sección colecciones.
 * Complementa el tab «Listas» de la navegación principal.
 */
export function CollectionsShellNav() {
  const { pathname } = useLocation();
  if (!isCollectionsSectionPath(pathname)) return null;

  const mineActive = isCollectionsMinePath(pathname);
  const exploreActive = isCollectionsExplorePath(pathname);

  return (
    <div className="border-t border-border/60">
      <nav
        className="mx-auto flex max-w-5xl gap-1 px-4 py-1.5 sm:px-6 lg:max-w-6xl"
        aria-label="Colecciones"
      >
        <NavLink
          to="/collections"
          end
          className={() =>
            cn(
              TAB_CLASS,
              mineActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
            )
          }
          aria-current={mineActive ? 'page' : undefined}
        >
          <Library className="h-4 w-4 shrink-0" aria-hidden />
          Mis listas
        </NavLink>
        <NavLink
          to="/collections/explore"
          className={() =>
            cn(
              TAB_CLASS,
              exploreActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
            )
          }
          aria-current={exploreActive ? 'page' : undefined}
        >
          <Compass className="h-4 w-4 shrink-0" aria-hidden />
          Explorar
        </NavLink>
      </nav>
    </div>
  );
}

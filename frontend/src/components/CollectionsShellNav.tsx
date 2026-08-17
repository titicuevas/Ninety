import { NavLink, useLocation } from 'react-router-dom';
import { Bookmark, Compass, Heart, Library } from 'lucide-react';
import {
  isCollectionsExplorePath,
  isCollectionsLikedPath,
  isCollectionsMinePath,
  isCollectionsSectionPath,
  isWantToGoPath,
} from '@/lib/collectionsNav';
import { cn } from '@/lib/utils';

const TAB_CLASS =
  'inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Subnav del shell: Mis listas / Explorar / Me gusta / Quiero ir.
 * Complementa el tab «Listas» de la navegación principal.
 */
export function CollectionsShellNav() {
  const { pathname } = useLocation();
  if (!isCollectionsSectionPath(pathname)) return null;

  const mineActive = isCollectionsMinePath(pathname);
  const exploreActive = isCollectionsExplorePath(pathname);
  const likedActive = isCollectionsLikedPath(pathname);
  const wantToGoActive = isWantToGoPath(pathname);

  return (
    <div className="border-t border-border/60">
      <nav
        className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-1.5 sm:px-6 lg:max-w-6xl"
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
        <NavLink
          to="/collections/likes"
          className={() =>
            cn(
              TAB_CLASS,
              likedActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
            )
          }
          aria-current={likedActive ? 'page' : undefined}
        >
          <Heart className="h-4 w-4 shrink-0" aria-hidden />
          Me gusta
        </NavLink>
        <NavLink
          to="/want-to-go"
          className={() =>
            cn(
              TAB_CLASS,
              wantToGoActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
            )
          }
          aria-current={wantToGoActive ? 'page' : undefined}
        >
          <Bookmark className="h-4 w-4 shrink-0" aria-hidden />
          Quiero ir
        </NavLink>
      </nav>
    </div>
  );
}

import { Link, NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Home, LogOut, Newspaper, Search, Ticket, User } from 'lucide-react';
import { SkipLink } from '@/components/SkipLink';
import { useAuth } from '@/hooks/useAuthInit';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/home', label: 'Inicio', icon: Home, end: true },
  { to: '/feed', label: 'Feed', icon: Newspaper },
  { to: '/search', label: 'Buscar', icon: Search },
  { to: '/capsules', label: 'Capsules', icon: Ticket },
  { to: '/profile', label: 'Perfil', icon: User },
];

/**
 * Breakpoint de shell:
 * - < lg (1024px): tab bar inferior (móvil + tablet portrait) — uso principal
 * - ≥ lg: nav horizontal en header (desktop / tablet landscape ancha)
 */
function desktopNavClass(isActive: boolean) {
  return cn(
    'inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
  );
}

function mobileTabClass(isActive: boolean) {
  return cn(
    'flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium sm:text-xs',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    isActive ? 'text-primary' : 'text-muted-foreground',
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="app-shell min-h-dvh">
      <SkipLink />

      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:max-w-6xl">
          <Link
            to="/home"
            className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30">
              90
            </span>
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">Ninety</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => desktopNavClass(isActive)}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => signOut()}
              className="ml-1 inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </nav>

          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      <main
        id="main-content"
        className={cn(
          'mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:max-w-6xl',
          // Tab bar hasta lg (móvil + tablet); desktop sin padding extra
          'pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] lg:pb-8',
        )}
      >
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden"
        aria-label="Navegación principal"
      >
        <ul className="mx-auto flex h-[4.25rem] max-w-2xl list-none items-stretch gap-0.5 px-1 py-0.5 sm:h-16 sm:max-w-3xl sm:px-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => mobileTabClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn('h-5 w-5 sm:h-6 sm:w-6', isActive && 'scale-105')} aria-hidden />
                    <span>{item.label}</span>
                    {isActive ? <span className="sr-only">(página actual)</span> : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

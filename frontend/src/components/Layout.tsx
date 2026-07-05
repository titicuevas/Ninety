import { Link, NavLink } from 'react-router-dom';
import { LogOut, Newspaper, Search, Ticket, User } from 'lucide-react';
import { SkipLink } from '@/components/SkipLink';
import { useAuth } from '@/hooks/useAuthInit';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
  );

const iconNavClass = ({ isActive }: { isActive: boolean }) =>
  cn(navLinkClass({ isActive }), 'inline-flex items-center justify-center p-1');

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <SkipLink />
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            to="/home"
            className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              90
            </span>
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">Ninety</span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-5" aria-label="Navegación principal">
            <NavLink to="/home" className={navLinkClass} end>
              <span className="hidden sm:inline">Inicio</span>
              <span className="sm:hidden">Home</span>
            </NavLink>
            <NavLink to="/feed" className={iconNavClass}>
              <Newspaper className="h-4 w-4" aria-hidden />
              <span className="sr-only">Feed</span>
            </NavLink>
            <NavLink to="/search" className={iconNavClass}>
              <Search className="h-4 w-4" aria-hidden />
              <span className="sr-only">Buscar partido</span>
            </NavLink>
            <NavLink to="/capsules" className={iconNavClass}>
              <Ticket className="h-4 w-4" aria-hidden />
              <span className="sr-only">Mis Capsules</span>
            </NavLink>
            <NavLink to="/profile" className={iconNavClass}>
              <User className="h-4 w-4" aria-hidden />
              <span className="sr-only">Perfil</span>
            </NavLink>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

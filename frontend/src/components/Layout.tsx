import { Link, NavLink } from 'react-router-dom';
import { LogOut, Newspaper, Search, Ticket, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuthInit';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn('text-sm font-medium transition-colors', isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground');

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/home" className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              90
            </span>
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">Ninety</span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <NavLink to="/home" className={navLinkClass} end>
              <span className="hidden sm:inline">Inicio</span>
              <span className="sm:hidden">Home</span>
            </NavLink>
            <NavLink to="/feed" className={navLinkClass} aria-label="Feed">
              <Newspaper className="h-4 w-4" />
              <span className="sr-only">Feed</span>
            </NavLink>
            <NavLink to="/search" className={navLinkClass}>
              <Search className="h-4 w-4" aria-hidden />
              <span className="sr-only">Buscar partido</span>
            </NavLink>
            <NavLink to="/capsules" className={navLinkClass}>
              <Ticket className="h-4 w-4" aria-hidden />
              <span className="sr-only">Mis Capsules</span>
            </NavLink>
            <NavLink to="/profile" className={navLinkClass} aria-label="Perfil">
              <User className="h-4 w-4" />
            </NavLink>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

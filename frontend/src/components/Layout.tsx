import { Link, NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Home, LogOut, Newspaper, Search, Ticket, User } from 'lucide-react';
import { SkipLink } from '@/components/SkipLink';
import { useAuth } from '@/hooks/useAuthInit';
import { cn } from '@/lib/utils';

function navClass(isActive: boolean) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => navClass(isActive)}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="hidden md:inline">{label}</span>
      <span className="md:sr-only">{label}</span>
    </NavLink>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <SkipLink />
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6 lg:max-w-6xl">
          <Link
            to="/home"
            className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              90
            </span>
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">Ninety</span>
          </Link>

          <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1" aria-label="Navegación principal">
            <NavItem to="/home" label="Inicio" icon={Home} end />
            <NavItem to="/feed" label="Feed" icon={Newspaper} />
            <NavItem to="/search" label="Buscar" icon={Search} />
            <NavItem to="/capsules" label="Capsules" icon={Ticket} />
            <NavItem to="/profile" label="Perfil" icon={User} />
            <button
              type="button"
              onClick={() => signOut()}
              className="ml-1 rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-6xl">
        {children}
      </main>
    </div>
  );
}

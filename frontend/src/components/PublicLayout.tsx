import { Link } from 'react-router-dom';
import { SkipLink } from '@/components/SkipLink';
import { useAuthInit, useAuth } from '@/hooks/useAuthInit';
import { useAuthReturnLinks } from '@/hooks/useAuthReturnLinks';
import { cn } from '@/lib/utils';

function LoadingSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Cargando">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();
  const { user, loading } = useAuth();
  const { loginTo, registerTo } = useAuthReturnLinks();

  if (loading) return <LoadingSpinner />;

  const homeHref = user ? '/home' : '/';

  return (
    <div className="app-shell min-h-dvh">
      <SkipLink />
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:max-w-6xl">
          <Link
            to={homeHref}
            className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm shadow-primary/30">
              90
            </span>
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">Ninety</span>
          </Link>

          <nav className="flex items-center gap-2 text-sm sm:gap-3" aria-label="Navegación pública">
            {user ? (
              <>
                <Link
                  to="/feed"
                  className="inline-flex min-h-10 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Feed
                </Link>
                <Link
                  to="/home"
                  className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Ir a la app
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={loginTo}
                  className="inline-flex min-h-10 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to={registerTo}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground',
                    'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:max-w-6xl"
      >
        {children}
      </main>
    </div>
  );
}

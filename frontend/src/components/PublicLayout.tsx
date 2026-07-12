import { Link } from 'react-router-dom';
import { SkipLink } from '@/components/SkipLink';
import { useAuthInit, useAuth } from '@/hooks/useAuthInit';
import { cn } from '@/lib/utils';

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  const homeHref = user ? '/home' : '/';

  return (
    <div className="min-h-screen bg-background">
      <SkipLink />
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            to={homeHref}
            className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              90
            </span>
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">Ninety</span>
          </Link>

          <nav className="flex items-center gap-3 text-sm" aria-label="Navegación pública">
            {user ? (
              <>
                <Link to="/feed" className="text-muted-foreground hover:text-foreground">
                  Feed
                </Link>
                <Link to="/home" className="font-medium text-primary hover:underline">
                  Ir a la app
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-muted-foreground hover:text-foreground">
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className={cn(
                    'rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground',
                    'hover:bg-primary/90',
                  )}
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-6xl">
        {children}
      </main>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NinetyLogo } from '@/components/NinetyLogo';
import { SkipLink } from '@/components/SkipLink';
import { useAuthInit, useAuth } from '@/hooks/useAuthInit';
import { useAuthReturnLinks } from '@/hooks/useAuthReturnLinks';
import { useI18n } from '@/lib/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();
  const { user } = useAuth();
  const { loginTo, registerTo } = useAuthReturnLinks();
  const { t } = useI18n();

  // No bloquear con loader: guests ven contenido al instante; la nav se actualiza al restaurar sesión.
  const homeHref = user ? '/home' : '/';

  return (
    <div className="app-shell min-h-dvh">
      <SkipLink />
      <header className="chrome-blur sticky top-0 z-50 border-b border-border/80 bg-background/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
          <Link
            to={homeHref}
            className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <NinetyLogo size="sm" />
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">Ninety</span>
          </Link>

          <nav className="flex items-center gap-1.5 text-sm sm:gap-3" aria-label={t.publicNavLabel}>
            <LanguageToggle size="sm" className="mr-0.5 sm:mr-1" />
            {user ? (
              <>
                <Link
                  to="/feed"
                  className="inline-flex min-h-10 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.publicNavFeed}
                </Link>
                <Link
                  to="/home"
                  className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.publicNavApp}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/search"
                  className="inline-flex min-h-10 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[380px]:hidden"
                >
                  {t.publicNavExplore}
                </Link>
                <Link
                  to={loginTo}
                  className="inline-flex min-h-10 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.publicNavLogin}
                </Link>
                <Link
                  to={registerTo}
                  className={cn(
                    'inline-flex min-h-10 items-center rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground',
                    'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  {t.publicNavRegister}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8"
      >
        {children}
      </main>
    </div>
  );
}

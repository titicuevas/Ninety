import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { NinetyLogo } from '@/components/NinetyLogo';
import { SkipLink } from '@/components/SkipLink';
import { buttonVariants } from '@/components/ui/button-variants';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { cn } from '@/lib/utils';

export function NotFoundPage() {
  usePageMetadata({
    title: 'Página no encontrada',
    description: 'La página que buscas no existe o se ha movido.',
    robots: 'noindex, follow',
  });

  return (
    <div className="landing-page min-h-dvh text-foreground">
      <SkipLink />
      <main id="main-content" className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
        <NinetyLogo size="lg" variant="mark" />
        <p className="mt-8 font-display text-7xl font-bold text-primary">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Fuera de juego</h1>
        <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
          Esta página no existe o el enlace ha cambiado. Vuelve al inicio o busca el próximo partido de tu diario.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/" className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}>
            Volver al inicio
          </Link>
          <Link to="/login" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full sm:w-auto')}>
            <Search className="mr-2 h-4 w-4" aria-hidden />
            Entrar en Ninety
          </Link>
        </div>
      </main>
    </div>
  );
}

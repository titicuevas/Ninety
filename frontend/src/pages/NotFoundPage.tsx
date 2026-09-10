import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { NinetyLogo } from '@/components/NinetyLogo';
import { SkipLink } from '@/components/SkipLink';
import { buttonVariants } from '@/components/ui/button-variants';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { cn } from '@/lib/utils';

export function NotFoundPage() {
  usePageMetadata({
    title: 'Página no encontrada',
    description: 'Fuera de juego: esta página no existe o el enlace ha cambiado.',
    robots: 'noindex, follow',
  });

  return (
    <div className="landing-page relative min-h-dvh overflow-hidden text-foreground">
      <SkipLink />
      {/* Líneas de área / césped sutiles */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] motion-glow"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 0%, transparent 48%, currentColor 48%, currentColor 52%, transparent 52%),
            linear-gradient(0deg, transparent 0%, transparent 48%, currentColor 48%, currentColor 52%, transparent 52%),
            radial-gradient(circle at 50% 50%, transparent 18%, currentColor 18.5%, currentColor 19%, transparent 19.5%)
          `,
          backgroundSize: '100% 100%, 100% 100%, min(70vw, 420px) min(70vw, 420px)',
          backgroundPosition: 'center, center, center',
          backgroundRepeat: 'no-repeat',
          color: 'var(--primary)',
        }}
      />
      <main
        id="main-content"
        className="motion-auth relative mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-12 text-center"
      >
        <NinetyLogo size="lg" variant="mark" />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Tarjeta roja</p>
        <p className="mt-2 font-display text-7xl font-bold text-primary sm:text-8xl">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Fuera de juego</h1>
        <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
          Esta jugada no está en el acta. La página no existe o el enlace ha cambiado — vuelve al
          vestuario o busca el próximo partido de tu diario.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/" className={cn(buttonVariants({ size: 'lg' }), 'min-h-11 w-full sm:w-auto')}>
            <Home className="mr-2 h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
          <Link
            to="/login"
            className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'min-h-11 w-full sm:w-auto')}
          >
            <Search className="mr-2 h-4 w-4" aria-hidden />
            Entrar en Ninety
          </Link>
        </div>
      </main>
    </div>
  );
}

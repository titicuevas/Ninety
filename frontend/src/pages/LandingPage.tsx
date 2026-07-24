import { Link } from 'react-router-dom';
import { BarChart3, Camera, Search } from 'lucide-react';
import { SkipLink } from '@/components/SkipLink';
import { LegalFooter } from '@/components/LegalFooter';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Search,
    title: 'Buscar partidos',
    desc: 'Ligas, copas y Champions: encuentra el partido que viviste.',
  },
  {
    icon: Camera,
    title: 'Capsules',
    desc: 'Fotos, nota y valoración. Tu recuerdo de cada encuentro.',
  },
  {
    icon: BarChart3,
    title: 'Tu resumen',
    desc: 'Wrapped, feed y aficionados a los que seguir.',
  },
] as const;

export function LandingPage() {
  return (
    <div className="landing-page min-h-dvh text-foreground">
      <SkipLink />
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12">
        <header className="mb-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
              90
            </span>
            <span className="text-xl font-semibold tracking-tight sm:text-2xl">Ninety</span>
          </div>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Iniciar sesión
          </Link>
        </header>

        <main id="main-content" className="flex flex-1 flex-col items-center text-center">
          <p className="mb-5 inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
            Beta abierta — tu diario de aficionado
          </p>

          <h1 className="mb-4 max-w-xl text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ninety
            <span className="mt-2 block text-primary">Tu diario de partidos vistos</span>
          </h1>

          <p className="mb-8 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Guarda los partidos que has visto, valóralos y revive la temporada con tu Wrapped. Letterboxd, pero para el
            fútbol.
          </p>

          <div
            className="mb-8 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/50 p-5 text-left shadow-lg shadow-black/25"
            aria-hidden
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Tu resumen · preview</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-background/60 p-3">
                <p className="text-2xl font-bold tabular-nums text-primary">12</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Partidos</p>
              </div>
              <div className="rounded-xl bg-background/60 p-3">
                <p className="text-2xl font-bold tabular-nums text-primary">4.2</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Media</p>
              </div>
              <div className="rounded-xl bg-background/60 p-3">
                <p className="text-2xl font-bold tabular-nums text-primary">3</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Ligas</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Último partido</p>
              <p className="mt-1 text-sm font-semibold">Real Betis 2 – 1 Villarreal</p>
              <p className="text-xs text-primary">LaLiga · valorado 4/5</p>
            </div>
          </div>

          <section className="mb-8 w-full max-w-lg" aria-labelledby="landing-features">
            <h2 id="landing-features" className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
              Ya disponible en la beta
            </h2>
            <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {features.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-border bg-card/80 p-4 text-left sm:text-center"
                >
                  <item.icon className="mb-2 h-5 w-5 text-primary sm:mx-auto" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              to="/register"
              className={cn(buttonVariants({ size: 'lg' }), 'min-h-12 w-full text-center sm:w-auto sm:min-w-44')}
            >
              Crear cuenta gratis
            </Link>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'lg' }),
                'min-h-12 w-full text-center sm:w-auto sm:min-w-44',
              )}
            >
              Ya tengo cuenta
            </Link>
          </div>

          <p className="mt-6 max-w-md text-xs text-muted-foreground">
            Al registrarte aceptas los{' '}
            <Link to="/terminos" className="text-primary underline-offset-2 hover:underline">
              Términos
            </Link>{' '}
            y la{' '}
            <Link to="/privacidad" className="text-primary underline-offset-2 hover:underline">
              Política de privacidad
            </Link>
            .
          </p>
        </main>

        <LegalFooter className="mt-10 border-t border-border pt-8" />
      </div>
    </div>
  );
}

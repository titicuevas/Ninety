import { Link } from 'react-router-dom';
import { UnderConstructionIllustration } from '@/components/UnderConstructionIllustration';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const roadmap = [
  { emoji: '🔍', title: 'Buscar partidos', desc: 'Encuentra cualquier partido que hayas visto' },
  { emoji: '📸', title: 'Capsules', desc: 'Fotos, nota y con quién lo viviste' },
  { emoji: '📊', title: 'Tu Wrapped', desc: 'Estadísticas de aficionado' },
] as const;

export function LandingPage() {
  return (
    <div className="landing-page min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              90
            </span>
            <span className="text-xl font-semibold tracking-tight">Ninety</span>
          </div>
          <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Iniciar sesión
          </Link>
        </header>

        <main className="flex flex-1 flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
            🏗️ En desarrollo — v0.2
          </div>

          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Estamos montando
            <span className="mt-1 block text-primary">tu diario futbolero</span>
          </h1>

          <p className="mb-8 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Como un estadio antes del primer partido: las gradas se están preparando. Muy pronto podrás
            guardar y revivir todos los partidos que has visto.
          </p>

          <div className="mb-8 w-full max-w-md rounded-2xl border border-border bg-zinc-900/60 p-4 shadow-lg shadow-black/20">
            <UnderConstructionIllustration className="h-auto w-full" />
          </div>

          <Card className="mb-8 w-full border-border bg-card text-left">
            <CardContent className="p-5 sm:p-6">
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-primary">
                Qué viene
              </p>
              <ul className="grid gap-4 sm:grid-cols-3">
                {roadmap.map((item) => (
                  <li key={item.title} className="text-center sm:text-left">
                    <span className="text-2xl">{item.emoji}</span>
                    <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className={cn(buttonVariants(), 'min-w-44 text-center')}>
              Quiero probarlo
            </Link>
            <Link to="/login" className={cn(buttonVariants({ variant: 'secondary' }), 'min-w-44 text-center')}>
              Ya tengo cuenta
            </Link>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Letterboxd + Strava + Spotify Wrapped, pero para el fútbol ⚽
          </p>
        </main>
      </div>
    </div>
  );
}

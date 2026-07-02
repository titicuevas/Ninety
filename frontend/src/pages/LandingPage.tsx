import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuthInit';

const features = [
  { title: 'Guarda recuerdos', desc: 'Valoración, fotos y con quién lo viste' },
  { title: 'Tu historia', desc: 'Estadísticas personales de aficionado' },
  { title: 'Comparte', desc: 'Revive tus mejores partidos con amigos' },
];

export function LandingPage() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--primary)_0%,_transparent_55%)] opacity-15" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="mb-8 flex items-center justify-between lg:mb-12">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground sm:h-10 sm:w-10">
              90
            </span>
            <span className="text-lg font-semibold tracking-tight sm:text-xl">Ninety</span>
          </Link>
          <Link to="/login" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Iniciar sesión
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-14">
          <motion.div
            className="w-full max-w-xl flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:text-sm">
              Bienvenido a Ninety
            </p>

            <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Tu diario futbolero
            </h1>

            <p className="mb-8 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Guarda y revive todos los partidos que has visto. Letterboxd + Strava + Spotify Wrapped,
              pero para el fútbol.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild className="w-full min-w-44 sm:w-auto">
                <Link to="/register">Empezar gratis</Link>
              </Button>
              <Button asChild variant="secondary" className="w-full min-w-44 sm:w-auto">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="w-full max-w-2xl flex-1"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <Card className="overflow-hidden border-border shadow-2xl shadow-emerald-950/20">
              <img
                src="/hero-cover.svg"
                alt="Estadio de fútbol con recuerdos de partidos guardados en Ninety"
                className="h-auto w-full object-cover"
                width={1200}
                height={800}
                loading="eager"
                fetchPriority="high"
              />
            </Card>
          </motion.div>
        </div>

        <motion.section
          className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-6 lg:mt-16"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card/60">
              <CardContent className="p-4 text-center sm:p-5 lg:text-left">
                <h2 className="text-sm font-semibold sm:text-base">{feature.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </motion.section>
      </div>
    </div>
  );
}

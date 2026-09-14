import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { NinetyLogo } from '@/components/NinetyLogo';
import { TeamCrest } from '@/components/TeamCrest';
import { SkipLink } from '@/components/SkipLink';
import { LegalFooter } from '@/components/LegalFooter';
import { buttonVariants } from '@/components/ui/button-variants';
import { useLandingShowcase } from '@/hooks/useLandingShowcase';
import { looksLikeAuthCallback } from '@/lib/authEmailCallback';
import { formatCapsuleScore, formatWatchedDate } from '@/lib/format';
import { LANDING_SHOWCASE_FALLBACK } from '@/lib/landingShowcaseFallback';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: '¿Qué es una Capsule?',
    answer:
      'Es la entrada de un partido en tu diario: resultado, valoración, nota, fotos y cómo o dónde lo viste.',
  },
  {
    question: '¿Ninety es gratis?',
    answer: 'Sí. Crear una cuenta y usar las funciones disponibles durante la beta no tiene coste.',
  },
  {
    question: '¿Puedo hacer privado mi diario?',
    answer:
      'Cada Capsule y cada colección puede ser pública o privada. Tú eliges su visibilidad al crearla o editarla.',
  },
  {
    question: '¿Puedo llevarme mis datos?',
    answer:
      'Sí. Desde Ajustes puedes exportar tu diario y tus colecciones en formatos reutilizables, además de eliminar tu cuenta.',
  },
] as const;

const landingStructuredData = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Ninety',
      url: 'https://www.getninety.app/',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      description:
        'Diario social para guardar, valorar y revivir los partidos de fútbol que has visto.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ],
});

function HeroCapsule({
  home,
  away,
  homeCrest,
  awayCrest,
  homeScore,
  awayScore,
  competition,
  watchedAt,
  rating,
  note,
}: {
  home: string;
  away: string;
  homeCrest: string | null;
  awayCrest: string | null;
  homeScore: number | null;
  awayScore: number | null;
  competition: string | null;
  watchedAt: string;
  rating: number | null;
  note: string | null;
}) {
  const score = formatCapsuleScore(homeScore, awayScore);
  const matchLabel = score ? `${home} ${score} ${away}` : `${home} vs ${away}`;

  return (
    <div className="landing-hero-capsule relative w-full max-w-lg overflow-hidden">
      <div
        className="pointer-events-none absolute -inset-x-8 -top-10 h-40 bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.22),_transparent_70%)]"
        aria-hidden
      />
      <div className="relative border-y border-primary/20 bg-zinc-950/90 px-4 py-6 sm:px-6 sm:py-7">
        <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/90">
          {competition ?? 'Capsule'}
          <span className="text-zinc-500"> · </span>
          {formatWatchedDate(watchedAt)}
        </p>

        <p className="sr-only">{matchLabel}</p>
        <div className="flex items-center gap-3 sm:gap-5" aria-hidden>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamCrest name={home} crest={homeCrest} size="lg" />
            <span className="w-full truncate text-sm font-semibold leading-tight sm:text-base">
              {home}
            </span>
          </div>
          <span className="shrink-0 font-display text-4xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-5xl">
            {score ?? 'vs'}
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            <TeamCrest name={away} crest={awayCrest} size="lg" />
            <span className="w-full truncate text-sm font-semibold leading-tight sm:text-base">
              {away}
            </span>
          </div>
        </div>

        {rating != null || note ? (
          <div className="mt-5 border-t border-white/10 pt-4 text-center">
            {rating != null ? (
              <span className="mb-2 inline-flex items-center justify-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3.5 w-3.5',
                      i < rating ? 'fill-primary text-primary' : 'fill-zinc-700 text-zinc-700',
                    )}
                    aria-hidden
                  />
                ))}
              </span>
            ) : null}
            {note ? (
              <p className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-zinc-300">
                “{note.length > 140 ? `${note.slice(0, 137)}…` : note}”
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LandingPage() {
  usePageMetadata({
    description:
      'Guarda, valora y revive cada partido que ves. Crea gratis tu diario futbolero con fotos, estadísticas, colecciones y Wrapped.',
  });
  const navigate = useNavigate();
  const { data } = useLandingShowcase();

  useEffect(() => {
    const { search, hash } = window.location;
    if (!looksLikeAuthCallback(search, hash)) return;
    navigate(`/auth/callback${search}${hash}`, { replace: true });
  }, [navigate]);

  const showcase = data ?? LANDING_SHOWCASE_FALLBACK;
  const featured = showcase.capsules[0] ?? null;
  const stats = showcase.stats;

  return (
    <div className="landing-page relative min-h-dvh overflow-x-hidden text-foreground">
      <script
        type="application/ld+json"
        nonce={document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') ?? undefined}
      >
        {landingStructuredData}
      </script>
      <SkipLink />

      <div className="landing-pitch pointer-events-none absolute inset-0" aria-hidden />
      <div className="landing-floodlight motion-glow pointer-events-none absolute inset-x-0 top-0 h-[55vh]" aria-hidden />
      <div className="landing-grain pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(7rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
        <header className="landing-header-enter mb-10 flex items-center justify-between gap-3 sm:mb-14">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <NinetyLogo size="md" className="transition-transform duration-300 hover:scale-[1.03]" />
            <span className="sr-only">Ninety</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-zinc-400 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Iniciar sesión
          </Link>
        </header>

        <main id="main-content" className="landing-stagger flex flex-1 flex-col items-center text-center">
          {/* Primer viewport: marca + claim + CTA + Capsule */}
          <div className="mb-3 flex flex-col items-center">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/90">
              Diario futbolero
            </p>
            <h1 className="font-display text-[clamp(4.25rem,18vw,7.5rem)] font-extrabold leading-[0.85] tracking-[-0.02em] text-foreground">
              Ninety
            </h1>
          </div>

          <p className="mb-4 max-w-md text-balance text-lg font-medium text-zinc-100 sm:text-xl">
            Cada partido que ves, guardado para siempre.
          </p>
          <p className="mb-9 max-w-md text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
            Capsules con valoración, nota y fotos. Letterboxd, pero para el fútbol.
          </p>

          <div className="mb-12 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'min-h-12 w-full text-center shadow-[0_12px_40px_-16px_rgba(52,211,153,0.55)] transition-transform duration-150 hover:scale-[1.015] active:scale-[0.99] sm:w-auto sm:min-w-48',
              )}
            >
              Crear mi diario gratis
            </Link>
            <Link
              to="/u/beta_ninety"
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'lg' }),
                'min-h-12 w-full text-center sm:w-auto sm:min-w-48',
              )}
            >
              Ver un diario real
            </Link>
          </div>

          {featured ? (
            <HeroCapsule
              home={featured.home_team_name}
              away={featured.away_team_name}
              homeCrest={featured.home_team_crest}
              awayCrest={featured.away_team_crest}
              homeScore={featured.home_score}
              awayScore={featured.away_score}
              competition={featured.competition_name}
              watchedAt={featured.watched_at}
              rating={featured.rating}
              note={featured.note}
            />
          ) : null}

          {/* Debajo del pliegue */}
          <section
            id="como-funciona"
            className="mt-16 w-full max-w-lg scroll-mt-8 text-left sm:mt-20"
            aria-labelledby="landing-how"
          >
            <h2
              id="landing-how"
              className="mb-6 text-center font-display text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Tres gestos. Toda la temporada.
            </h2>
            <ol className="space-y-5 border-l border-primary/30 pl-5">
              <li>
                <p className="font-display text-xl font-bold text-primary">01 · Busca el partido</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Ligas, copas y Champions. Encuentra lo que acabas de vivir.
                </p>
              </li>
              <li>
                <p className="font-display text-xl font-bold text-primary">02 · Crea la Capsule</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Valoración, nota, fotos y contexto: estadio, bar o sofá.
                </p>
              </li>
              <li>
                <p className="font-display text-xl font-bold text-primary">03 · Revive el año</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Wrapped, colecciones y un feed de aficionados como tú.
                </p>
              </li>
            </ol>
            {stats ? (
              <p className="mt-8 text-center text-sm text-zinc-500">
                @beta_ninety ya lleva{' '}
                <span className="font-display text-lg font-bold tabular-nums text-primary">
                  {stats.totalMatches}
                </span>{' '}
                partidos en el diario.
              </p>
            ) : null}
          </section>

          <section className="mt-16 w-full max-w-lg text-left sm:mt-20" aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="mb-5 text-center font-display text-3xl font-bold tracking-tight"
            >
              Preguntas frecuentes
            </h2>
            <div className="space-y-2">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group border-b border-border/60 py-3 open:pb-4"
                >
                  <summary className="cursor-pointer list-none pr-6 text-sm font-semibold marker:content-none">
                    {faq.question}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="mt-14 flex w-full max-w-lg flex-col items-center gap-4 sm:mt-16">
            <Link to="/register" className={cn(buttonVariants({ size: 'lg' }), 'min-h-12 min-w-52')}>
              Empezar gratis
            </Link>
            <p className="max-w-md text-xs leading-relaxed text-zinc-500">
              Al registrarte aceptas los{' '}
              <Link to="/terminos" className="text-primary underline underline-offset-2">
                Términos
              </Link>{' '}
              y la{' '}
              <Link to="/privacidad" className="text-primary underline underline-offset-2">
                Política de privacidad
              </Link>
              . Soporte:{' '}
              <a className="text-primary underline underline-offset-2" href="mailto:hello@getninety.app">
                hello@getninety.app
              </a>
              .
            </p>
          </div>
        </main>

        <LegalFooter className="mt-14 border-t border-border/60 pt-8" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-zinc-950/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:hidden">
        <Link to="/register" className={cn(buttonVariants({ size: 'lg' }), 'min-h-12 w-full')}>
          Crear mi diario gratis
        </Link>
      </div>
    </div>
  );
}

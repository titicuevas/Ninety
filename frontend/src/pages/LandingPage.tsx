import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Camera, Search, Star, Trophy, Users } from 'lucide-react';
import { NinetyLogo } from '@/components/NinetyLogo';
import { TeamCrest } from '@/components/TeamCrest';
import { SkipLink } from '@/components/SkipLink';
import { LegalFooter } from '@/components/LegalFooter';
import { buttonVariants } from '@/components/ui/button-variants';
import { useLandingShowcase } from '@/hooks/useLandingShowcase';
import { looksLikeAuthCallback } from '@/lib/authEmailCallback';
import { formatCapsuleScore, formatWatchedDate } from '@/lib/format';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
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
    desc: 'Valoración, nota y fotos. La entrada de tu diario futbolero.',
  },
  {
    icon: BarChart3,
    title: 'Tu Wrapped',
    desc: 'Resumen anual, feed social y aficionados a los que seguir.',
  },
] as const;

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i < rating ? 'fill-primary text-primary' : 'fill-muted text-muted',
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

function ShowcaseStats({
  total,
  avg,
  topComp,
}: {
  total: number;
  avg: number | null;
  topComp: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
      <div className="rounded-xl bg-background/55 px-2 py-3.5 sm:p-4">
        <p className="font-display text-2xl font-bold tabular-nums text-primary">{total}</p>
        <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">Partidos</p>
      </div>
      <div className="rounded-xl bg-background/55 px-2 py-3.5 sm:p-4">
        <p className="font-display text-2xl font-bold tabular-nums text-primary">
          {avg != null ? avg.toFixed(1) : '—'}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">Media</p>
      </div>
      <div className="rounded-xl bg-background/55 px-2 py-3.5 sm:p-4">
        <p className="truncate text-sm font-bold text-primary">
          {topComp ?? '—'}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">Liga top</p>
      </div>
    </div>
  );
}

function ShowcaseSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/30" />
        ))}
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/20" />
        ))}
      </div>
    </div>
  );
}

function CapsuleRow({
  home,
  away,
  homeCrest,
  awayCrest,
  homeScore,
  awayScore,
  competition,
  watchedAt,
  rating,
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
}) {
  const score = formatCapsuleScore(homeScore, awayScore);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background/35 px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TeamCrest name={home} crest={homeCrest} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold leading-tight text-foreground">
            {home}
          {score ? (
            <span className="mx-1.5 font-display font-bold tabular-nums text-primary">{score}</span>
          ) : (
            <span className="mx-1.5 text-muted-foreground">vs</span>
          )}
            {away}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {competition ? `${competition} · ` : ''}{formatWatchedDate(watchedAt)}
          </p>
        </div>
      </div>
      <TeamCrest name={away} crest={awayCrest} size="sm" />
      <StarRating rating={rating} />
    </div>
  );
}

export function LandingPage() {
  useDocumentTitle();
  const navigate = useNavigate();
  const { data, isLoading } = useLandingShowcase();

  useEffect(() => {
    const { search, hash } = window.location;
    if (!looksLikeAuthCallback(search, hash)) return;
    navigate(`/auth/callback${search}${hash}`, { replace: true });
  }, [navigate]);

  const stats = data?.stats;
  const capsules = data?.capsules.slice(0, 3) ?? [];
  const hasData = !isLoading && data != null;

  return (
    <div className="landing-page min-h-dvh text-foreground">
      <SkipLink />
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12">

        {/* Header */}
        <header className="mb-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <NinetyLogo size="md" />
            <span className="text-xl font-semibold tracking-tight sm:text-2xl">Ninety</span>
          </div>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Iniciar sesión
          </Link>
        </header>

        <main id="main-content" className="landing-stagger flex flex-1 flex-col items-center text-center">

          {/* Badge */}
          <p className="mb-6 inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
            Beta abierta — tu diario de aficionado
          </p>

          {/* Hero */}
          <h1 className="mb-5 max-w-xl text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-[3.25rem] md:leading-[1.1]">
            Ninety
            <span className="mt-2.5 block text-[0.85em] font-bold text-primary sm:mt-3">
              Tu diario de partidos vistos
            </span>
          </h1>

          <p className="mb-10 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Guarda cada partido que has visto como una{' '}
            <span className="font-semibold text-foreground">Capsule</span> — valoración, nota y
            fotos — y revive la temporada con tu Wrapped.{' '}
            <span className="font-semibold text-foreground">Letterboxd, pero para el fútbol.</span>
          </p>

          {/* Showcase: diario real de @beta_ninety */}
          <div
            className="mb-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/45 p-5 shadow-lg shadow-black/25 sm:p-6"
            aria-hidden
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Diario real · @beta_ninety
              </p>
              <Link
                to="/u/beta_ninety"
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                tabIndex={-1}
                aria-hidden
              >
                Ver diario →
              </Link>
            </div>

            {isLoading && <ShowcaseSkeleton />}

            {hasData && stats && (
              <ShowcaseStats
                total={stats.totalMatches}
                avg={stats.averageRating}
                topComp={stats.topCompetition?.name ?? null}
              />
            )}

            {hasData && !stats && (
              <ShowcaseStats total={data.total} avg={null} topComp={null} />
            )}

            {hasData && capsules.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {capsules.map((c) => (
                  <CapsuleRow
                    key={c.id}
                    home={c.home_team_name}
                    away={c.away_team_name}
                    homeCrest={c.home_team_crest}
                    awayCrest={c.away_team_crest}
                    homeScore={c.home_score}
                    awayScore={c.away_score}
                    competition={c.competition_name}
                    watchedAt={c.watched_at}
                    rating={c.rating}
                  />
                ))}
              </div>
            )}

            {/* Stats secundarias si las hay */}
            {hasData && stats && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-border/30 pt-3">
                {stats.stadiumVisits > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Trophy className="h-3 w-3 text-primary" />
                    {stats.stadiumVisits} estadios
                  </span>
                )}
                {stats.fiveStarCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    {stats.fiveStarCount} valoración perfecta
                  </span>
                )}
                {stats.topTeam && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3 text-primary" />
                    {stats.topTeam.name} ({stats.topTeam.count})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Features */}
          <section className="mb-10 w-full max-w-lg" aria-labelledby="landing-features">
            <h2
              id="landing-features"
              className="mb-4 text-xs font-bold uppercase tracking-wider text-primary"
            >
              Ya disponible en la beta
            </h2>
            <ul className="grid gap-3 sm:grid-cols-3 sm:gap-3.5">
              {features.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-border/80 bg-card/70 p-4 text-left sm:px-3.5 sm:text-center"
                >
                  <item.icon className="mb-2.5 h-5 w-5 text-primary sm:mx-auto" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* CTAs */}
          <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'min-h-12 w-full text-center sm:w-auto sm:min-w-44',
              )}
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

          <p className="mt-6 max-w-md text-xs leading-relaxed text-muted-foreground">
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

        <LegalFooter className="mt-12 border-t border-border/80 pt-8" />
      </div>
    </div>
  );
}

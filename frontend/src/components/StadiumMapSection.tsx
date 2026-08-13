import { Link } from 'react-router-dom';
import { Landmark, MapPinned, Star } from 'lucide-react';
import type { StadiumMapResult, StadiumVisit } from '@/lib/stadiumMap';
import {
  projectStadium,
  stadiumCapsuleHref,
  stadiumDiaryHref,
} from '@/lib/stadiumMap';
import { formatWatchedDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type StadiumMapSectionProps = {
  map: StadiumMapResult;
  className?: string;
};

function StadiumPins({
  visits,
  favoriteId,
}: {
  visits: StadiumVisit[];
  favoriteId: string | null;
}) {
  const pins = visits
    .map((v) => {
      const point = projectStadium(v.stadium.lat, v.stadium.lng);
      if (!point) return null;
      return { visit: v, ...point };
    })
    .filter((p): p is { visit: StadiumVisit; x: number; y: number } => p != null);

  if (pins.length === 0) return null;

  return (
    <svg
      viewBox="0 0 100 70"
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="Mapa de estadios visitados en Europa occidental"
    >
      <defs>
        <radialGradient id="stadium-map-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(16,185,129,0.25)" />
          <stop offset="100%" stopColor="rgba(16,185,129,0)" />
        </radialGradient>
      </defs>
      <rect width="100" height="70" rx="3" fill="url(#stadium-map-glow)" opacity="0.5" />
      <path
        d="M8 52 C18 48 22 40 28 38 C34 28 42 22 52 20 C62 18 72 22 78 28 C86 36 90 44 88 52 C82 58 70 62 55 63 C40 64 22 60 8 52 Z"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.6"
      />
      {pins.map(({ visit, x, y }) => {
        const isFavorite = visit.stadium.id === favoriteId;
        const r = Math.min(3.2, (isFavorite ? 1.6 : 1.2) + visit.visits * 0.35);
        const cy = y * 0.7;
        return (
          <g key={visit.stadium.id}>
            <circle cx={x} cy={cy} r={r + 1.4} fill="rgba(16,185,129,0.2)" />
            {isFavorite ? (
              <circle
                cx={x}
                cy={cy}
                r={r + 2.2}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="0.7"
                opacity="0.95"
              />
            ) : null}
            <circle
              cx={x}
              cy={cy}
              r={r}
              fill={isFavorite ? '#fbbf24' : '#10b981'}
              className="motion-reveal"
            />
            <title>
              {isFavorite ? 'Tu estadio · ' : ''}
              {visit.stadium.name} · {visit.visits}{' '}
              {visit.visits === 1 ? 'visita' : 'visitas'}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

function FavoriteStadiumCard({ favorite }: { favorite: StadiumVisit }) {
  const capsuleHref = stadiumCapsuleHref(favorite.capsuleIds[0]);
  const diaryHref = stadiumDiaryHref();

  return (
    <div
      className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-4 sm:p-5"
      data-testid="favorite-stadium-card"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
            <Star className="h-4 w-4 fill-current" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-500/90">
              Tu estadio
            </p>
            <p className="mt-0.5 truncate text-base font-semibold">{favorite.stadium.name}</p>
            <p className="text-sm text-muted-foreground">
              {favorite.stadium.city}
              {' · '}
              {favorite.visits} {favorite.visits === 1 ? 'visita' : 'visitas'}
              {favorite.averageRating != null
                ? ` · media ${favorite.averageRating.toFixed(1)}★`
                : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {capsuleHref ? (
            <Link
              to={capsuleHref}
              className="inline-flex min-h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ver última visita
            </Link>
          ) : null}
          <Link
            to={diaryHref}
            className="inline-flex min-h-9 items-center rounded-md border border-border bg-secondary px-3 text-sm font-medium text-foreground hover:bg-secondary/80"
          >
            Diario · estadio
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Mapa ligero de estadios visitados (catálogo + capsules en estadio).
 */
export function StadiumMapSection({ map, className }: StadiumMapSectionProps) {
  if (map.stadiumCapsuleCount === 0) {
    return (
      <section
        id="stadium-map"
        className={cn('space-y-3 motion-reveal', className)}
        aria-labelledby="stadium-map-heading"
      >
        <div>
          <h2
            id="stadium-map-heading"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <MapPinned className="h-5 w-5 text-primary" aria-hidden="true" />
            Mapa de estadios
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Marca un partido como visto en estadio y aparecerán pins de las sedes que
            reconozcamos.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Aún no tienes visitas en el diario.{' '}
          <Link to="/search" className="text-primary hover:underline">
            Guarda tu próximo partido en la grada
          </Link>
          .
        </p>
      </section>
    );
  }

  const headingId = 'stadium-map-heading';
  const favoriteId = map.favorite?.stadium.id ?? null;
  const diaryHref = stadiumDiaryHref();

  return (
    <section
      id="stadium-map"
      className={cn('space-y-5 motion-reveal', className)}
      aria-labelledby={headingId}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <MapPinned className="h-5 w-5 text-primary" aria-hidden="true" />
            Mapa de estadios
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {map.visits.length > 0
              ? `${map.visits.length} sede${map.visits.length === 1 ? '' : 's'} · ${map.stadiumCapsuleCount} visita${map.stadiumCapsuleCount === 1 ? '' : 's'}${map.countries.length > 0 ? ` · ${map.countries.length} país${map.countries.length === 1 ? '' : 'es'}` : ''}`
              : `${map.stadiumCapsuleCount} visita${map.stadiumCapsuleCount === 1 ? '' : 's'} en estadio`}
          </p>
        </div>
        <Link
          to={diaryHref}
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver en el diario
        </Link>
      </div>

      {map.favorite ? <FavoriteStadiumCard favorite={map.favorite} /> : null}

      {map.visits.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-emerald-950/40 via-background to-background p-4 sm:p-5">
          <StadiumPins visits={map.visits} favoriteId={favoriteId} />
        </div>
      ) : null}

      {map.visits.length > 0 ? (
        <ul className="space-y-3">
          {map.visits.map((visit) => {
            const isFavorite = visit.stadium.id === favoriteId;
            const capsuleHref = stadiumCapsuleHref(visit.capsuleIds[0]);
            const row = (
              <>
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    isFavorite
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-primary/15 text-primary',
                  )}
                  aria-hidden="true"
                >
                  {isFavorite ? (
                    <Star className="h-4 w-4 fill-current" />
                  ) : (
                    <Landmark className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {visit.stadium.name}
                    {isFavorite ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-500">
                        Favorito
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {visit.stadium.city}
                    {visit.lastWatchedAt
                      ? ` · última ${formatWatchedDate(visit.lastWatchedAt)}`
                      : ''}
                    {visit.averageRating != null
                      ? ` · media ${visit.averageRating.toFixed(1)}★`
                      : ''}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-semibold tabular-nums',
                    isFavorite ? 'text-amber-500' : 'text-primary',
                  )}
                >
                  {visit.visits}×
                </span>
              </>
            );

            return (
              <li key={visit.stadium.id}>
                {capsuleHref ? (
                  <Link
                    to={capsuleHref}
                    className="flex items-start gap-3 rounded-lg p-1 -m-1 transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${visit.stadium.name}, ${visit.visits} visitas`}
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {map.unmatchedStadiumCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {map.unmatchedStadiumCount} visita
          {map.unmatchedStadiumCount === 1 ? '' : 's'} aún sin sede en el catálogo — iremos
          ampliando el mapa.
        </p>
      ) : null}
    </section>
  );
}

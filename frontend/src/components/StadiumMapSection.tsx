import { Link } from 'react-router-dom';
import { Landmark, MapPinned } from 'lucide-react';
import type { StadiumMapResult, StadiumVisit } from '@/lib/stadiumMap';
import { projectStadium } from '@/lib/stadiumMap';
import { formatWatchedDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type StadiumMapSectionProps = {
  map: StadiumMapResult;
  className?: string;
};

function StadiumPins({ visits }: { visits: StadiumVisit[] }) {
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
      {/* Contorno suave — silueta aproximada Europa W */}
      <path
        d="M8 52 C18 48 22 40 28 38 C34 28 42 22 52 20 C62 18 72 22 78 28 C86 36 90 44 88 52 C82 58 70 62 55 63 C40 64 22 60 8 52 Z"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.6"
      />
      {pins.map(({ visit, x, y }) => {
        const r = Math.min(2.8, 1.2 + visit.visits * 0.35);
        return (
          <g key={visit.stadium.id}>
            <circle cx={x} cy={y * 0.7} r={r + 1.2} fill="rgba(16,185,129,0.2)" />
            <circle cx={x} cy={y * 0.7} r={r} fill="#10b981" className="motion-reveal" />
            <title>
              {visit.stadium.name} · {visit.visits}{' '}
              {visit.visits === 1 ? 'visita' : 'visitas'}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Mapa ligero de estadios visitados (catálogo + capsules en estadio).
 */
export function StadiumMapSection({ map, className }: StadiumMapSectionProps) {
  if (map.stadiumCapsuleCount === 0) {
    return (
      <section
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

  return (
    <section className={cn('space-y-5 motion-reveal', className)} aria-labelledby={headingId}>
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

      {map.visits.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-emerald-950/40 via-background to-background p-4 sm:p-5">
          <StadiumPins visits={map.visits} />
        </div>
      ) : null}

      {map.visits.length > 0 ? (
        <ul className="space-y-3">
          {map.visits.map((visit) => (
            <li key={visit.stadium.id} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                aria-hidden="true"
              >
                <Landmark className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{visit.stadium.name}</p>
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
              <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                {visit.visits}×
              </span>
            </li>
          ))}
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

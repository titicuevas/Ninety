import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { CapsuleCardSocialFooter } from '@/components/CapsuleCardSocialFooter';
import { CapsuleListCard } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { NinetyLoader } from '@/components/NinetyLoader';
import { PublicLayout } from '@/components/PublicLayout';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { ShareDiaryMonthButton } from '@/components/ShareDiaryMonthButton';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuthInit';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { usePublicDiaryCalendar } from '@/hooks/usePublicDiaryCalendar';
import { capsuleShareSummaryFrom } from '@/lib/capsuleShare';
import {
  buildMonthGrid,
  capsulesForDate,
  countCapsulesByWatchedDate,
  formatCalendarMonthTitle,
  weekdayLabels,
} from '@/lib/diaryCalendar';
import { formatWatchedDate } from '@/lib/format';
import { publicProfilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';

function parseYearMonth(yearRaw?: string, monthRaw?: string): { year: number; month: number } | null {
  const year = yearRaw != null ? Number(yearRaw) : NaN;
  const month = monthRaw != null ? Number(monthRaw) : NaN;
  if (
    Number.isInteger(year) &&
    year >= 1990 &&
    year <= 2100 &&
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12
  ) {
    return { year, month };
  }
  return null;
}

export function PublicDiaryMonthPage() {
  const { username, year: yearParam, month: monthParam } = useParams<{
    username: string;
    year: string;
    month: string;
  }>();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDate = searchParams.get('day');
  const parsed = parseYearMonth(yearParam, monthParam);
  const year = parsed?.year ?? 0;
  const month = parsed?.month ?? 0;

  const { data, isLoading, isError, error, refetch, isRefetching } = usePublicDiaryCalendar(
    username,
    year,
    month,
  );

  const profile = data?.profile;
  const displayName = profile?.display_name ?? profile?.username ?? username ?? 'Aficionado';
  const handle = profile?.username ?? username ?? '';
  const title = parsed ? formatCalendarMonthTitle(year, month) : 'Calendario';
  const authorHref = publicProfilePath(profile?.username ?? username);

  useDocumentTitle(parsed ? `${title} · ${displayName}` : 'Calendario');

  const counts = useMemo(
    () => countCapsulesByWatchedDate(data?.capsules ?? []),
    [data?.capsules],
  );
  const grid = useMemo(
    () => (parsed ? buildMonthGrid(year, month, counts) : []),
    [parsed, year, month, counts],
  );
  const dayCapsules = useMemo(() => {
    if (!selectedDate || !data?.capsules) return [];
    return capsulesForDate(data.capsules, selectedDate);
  }, [data?.capsules, selectedDate]);

  const Shell = user ? Layout : PublicLayout;
  const todayKey = new Date().toISOString().slice(0, 10);
  const total = data?.total ?? 0;

  const selectDay = (date: string, count: number) => {
    if (count <= 0) return;
    const params = new URLSearchParams(searchParams);
    params.set('day', date);
    setSearchParams(params, { replace: false });
  };

  const clearDay = () => {
    setSearchParams({}, { replace: false });
  };

  if (!parsed) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Mes no válido</h1>
          <p className="text-sm text-muted-foreground">
            El enlace del calendario debe incluir año y mes (1–12).
          </p>
          <Button asChild variant="secondary">
            <Link to={authorHref ?? (user ? '/home' : '/')}>Volver</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <NinetyLoader variant="panel" label="Cargando mes…" />
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Mes no disponible</h1>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : 'Este mes no tiene Capsules públicas para compartir.'}
          </p>
          {isError ? (
            <QueryErrorCard
              message={error instanceof Error ? error.message : 'Error al cargar'}
              loading={isRefetching}
              onRetry={() => void refetch()}
            />
          ) : null}
          <Button asChild variant="secondary">
            <Link to={authorHref ?? (user ? '/home' : '/')}>
              {authorHref ? 'Ver perfil' : 'Volver'}
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-5 sm:space-y-8">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Capsules públicas de{' '}
              {authorHref ? (
                <Link to={authorHref} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {displayName}
                </Link>
              ) : (
                displayName
              )}{' '}
              · @{handle}
            </p>
          </div>
          <ShareDiaryMonthButton
            username={handle}
            year={year}
            month={month}
            publicTotal={total}
            capsules={data?.capsules ?? []}
            displayName={displayName}
            className="shrink-0"
            compact
          />
        </section>

        <div
          className="rounded-xl border border-border/60 bg-card/40 p-3 sm:p-4"
          role="grid"
          aria-label={`Calendario ${title}`}
        >
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {weekdayLabels().map((label) => (
              <div key={label} role="columnheader">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, idx) => {
              if (cell.kind === 'pad') {
                return <div key={`pad-${idx}`} className="aspect-square" aria-hidden />;
              }
              const has = cell.count > 0;
              const selected = selectedDate === cell.date;
              const isToday = cell.date === todayKey;
              return (
                <button
                  key={cell.date}
                  type="button"
                  role="gridcell"
                  disabled={!has}
                  aria-label={
                    has
                      ? `${cell.day}: ${cell.count} ${cell.count === 1 ? 'Capsule' : 'Capsules'}`
                      : `${cell.day}: sin Capsules`
                  }
                  aria-selected={selected || undefined}
                  onClick={() => selectDay(cell.date, cell.count)}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors',
                    has
                      ? 'bg-primary/15 font-semibold text-foreground hover:bg-primary/25'
                      : 'text-muted-foreground/70',
                    selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                    isToday && !selected && 'outline outline-1 outline-primary/40',
                  )}
                >
                  <span className="tabular-nums">{cell.day}</span>
                  {has ? (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {total === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Sin Capsules públicas"
            description="Este mes no tiene Capsules públicas en el diario."
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {total} {total === 1 ? 'Capsule pública' : 'Capsules públicas'} en {title.toLowerCase()}
            {!selectedDate ? ' · Toca un día marcado para ver el detalle' : null}
          </p>
        )}

        {selectedDate ? (
          <section className="space-y-4" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                {formatWatchedDate(selectedDate)}
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={clearDay}>
                Cerrar
              </Button>
            </div>
            {dayCapsules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay Capsules este día.</p>
            ) : (
              <ul className="space-y-3">
                {dayCapsules.map((capsule) => (
                  <li key={capsule.id}>
                    <CapsuleListCard
                      capsule={capsule}
                      showWatchedDate
                      footerBordered={!!user}
                      footer={
                        user ? (
                          <CapsuleCardSocialFooter
                            capsuleId={capsule.id}
                            capsuleOwnerId={capsule.user_id}
                            currentUserId={user.id}
                            likesCount={capsule.likes_count}
                            likedByMe={capsule.liked_by_me}
                            commentsCount={capsule.comments_count}
                            alsoWatched={capsule.also_watched}
                            alsoLiked={capsule.also_liked}
                            alsoCommented={capsule.also_commented}
                            shareTitle={`${capsule.home_team_name} vs ${capsule.away_team_name}`}
                            share={capsuleShareSummaryFrom(capsule, profile)}
                            isPublic={capsule.is_public !== false}
                          />
                        ) : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </Shell>
  );
}

import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { CapsuleCardSocialFooter } from '@/components/CapsuleCardSocialFooter';
import { CapsuleListCard, capsuleCardListClass } from '@/components/CapsuleListCard';
import { EmptyState } from '@/components/EmptyState';
import { Layout } from '@/components/Layout';
import { NinetyLoader } from '@/components/NinetyLoader';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { ShareDiaryMonthButton } from '@/components/ShareDiaryMonthButton';
import { Button } from '@/components/ui/button';
import { useDiaryCalendar } from '@/hooks/useDiaryCalendar';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfile } from '@/hooks/useProfile';
import { capsuleShareSummaryFrom } from '@/lib/capsuleShare';
import {
  buildMonthGrid,
  capsulesForDate,
  countCapsulesByWatchedDate,
  countPublicCapsules,
  formatCalendarMonthTitle,
  parseCalendarMonthParam,
  shiftCalendarMonth,
  weekdayLabels,
} from '@/lib/diaryCalendar';
import { formatWatchedDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export function DiaryCalendarPage() {
  useDocumentTitle('Calendario del diario');
  const [searchParams, setSearchParams] = useSearchParams();
  const { year, month } = parseCalendarMonthParam(
    searchParams.get('year'),
    searchParams.get('month'),
  );
  const selectedDate = searchParams.get('day');
  const { data: profile } = useProfile();

  const { data, isLoading, isError, error, refetch, isRefetching } = useDiaryCalendar(year, month);

  const title = formatCalendarMonthTitle(year, month);
  const counts = useMemo(
    () => countCapsulesByWatchedDate(data?.capsules ?? []),
    [data?.capsules],
  );
  const grid = useMemo(() => buildMonthGrid(year, month, counts), [year, month, counts]);
  const dayCapsules = useMemo(() => {
    if (!selectedDate || !data?.capsules) return [];
    return capsulesForDate(data.capsules, selectedDate);
  }, [data?.capsules, selectedDate]);
  const publicTotal =
    typeof data?.public_total === 'number'
      ? data.public_total
      : countPublicCapsules(data?.capsules ?? []);

  const goMonth = (delta: number) => {
    const next = shiftCalendarMonth({ year, month }, delta);
    const params = new URLSearchParams();
    params.set('year', String(next.year));
    params.set('month', String(next.month));
    setSearchParams(params, { replace: false });
  };

  const selectDay = (date: string, count: number) => {
    if (count <= 0) return;
    const params = new URLSearchParams(searchParams);
    params.set('year', String(year));
    params.set('month', String(month));
    params.set('day', date);
    setSearchParams(params, { replace: false });
  };

  const clearDay = () => {
    const params = new URLSearchParams();
    params.set('year', String(year));
    params.set('month', String(month));
    setSearchParams(params, { replace: false });
  };

  const total = data?.total ?? 0;
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-5 sm:space-y-8">
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Calendario</h1>
            {!isLoading && total > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {total} {total === 1 ? 'Capsule' : 'Capsules'} este mes
                {publicTotal > 0 ? ` · ${publicTotal} pública${publicTotal === 1 ? '' : 's'}` : ''}
              </p>
            ) : null}
          </div>
          {profile?.username ? (
            <ShareDiaryMonthButton
              username={profile.username}
              year={year}
              month={month}
              publicTotal={publicTotal}
              capsules={data?.capsules ?? []}
              displayName={profile.display_name}
              compact
            />
          ) : null}
        </section>

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Mes anterior"
            onClick={() => goMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-center text-lg font-semibold tracking-tight">{title}</h2>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Mes siguiente"
            onClick={() => goMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? <NinetyLoader label="Cargando calendario…" /> : null}

        {isError ? (
          <QueryErrorCard
            message={error instanceof Error ? error.message : 'No se pudo cargar el calendario'}
            loading={isRefetching}
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isLoading && !isError ? (
          <>
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
                        <span
                          className="mt-0.5 h-1 w-1 rounded-full bg-primary"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {total === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sin Capsules este mes"
                description="Guarda un partido visto en este mes o navega a otro mes del diario."
              >
                <Button asChild>
                  <Link to="/search">Buscar partido</Link>
                </Button>
              </EmptyState>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {total} {total === 1 ? 'Capsule' : 'Capsules'} en {title.toLowerCase()}
                {publicTotal > 0 && publicTotal < total
                  ? ` · ${publicTotal} públicas para compartir`
                  : null}
                {!selectedDate ? ' · Toca un día marcado para ver el detalle' : null}
              </p>
            )}

            {selectedDate ? (
              <section className="space-y-4" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight">
                    {formatWatchedDate(selectedDate)}
                  </h3>
                  <Button type="button" variant="ghost" size="sm" onClick={clearDay}>
                    Cerrar
                  </Button>
                </div>
                {dayCapsules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay Capsules este día.</p>
                ) : (
                  <ul className={capsuleCardListClass}>
                    {dayCapsules.map((capsule) => (
                      <li key={capsule.id}>
                        <CapsuleListCard
                          capsule={capsule}
                          showWatchedDate
                          footerBordered
                          footer={
                            <CapsuleCardSocialFooter
                              capsuleId={capsule.id}
                              capsuleOwnerId={capsule.user_id}
                              currentUserId={profile?.id}
                              likesCount={capsule.likes_count}
                              likedByMe={capsule.liked_by_me}
                              commentsCount={capsule.comments_count}
                              shareTitle={`${capsule.home_team_name} vs ${capsule.away_team_name}`}
                              share={capsuleShareSummaryFrom(capsule, profile)}
                              isPublic={capsule.is_public !== false}
                              showShare={false}
                            />
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </Layout>
  );
}

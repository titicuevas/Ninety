import { TeamCrest } from '@/components/TeamCrest';
import {
  calendarDayHeatClass,
  type CalendarCell,
  type DayCrestPreview,
  weekdayLabels,
} from '@/lib/diaryCalendar';
import { cn } from '@/lib/utils';

type DiaryMonthCalendarProps = {
  title: string;
  grid: CalendarCell[];
  selectedDate: string | null;
  todayKey: string;
  dayPreviews: Map<string, DayCrestPreview>;
  crestStrip?: DayCrestPreview[];
  onSelectDay: (date: string, count: number) => void;
};

export function DiaryMonthCalendar({
  title,
  grid,
  selectedDate,
  todayKey,
  dayPreviews,
  crestStrip = [],
  onSelectDay,
}: DiaryMonthCalendarProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-emerald-500/[0.07] via-card/80 to-card/40 p-3 shadow-[inset_0_1px_0_rgba(52,211,153,0.12)] sm:p-4"
      role="group"
      aria-label={`Calendario ${title}`}
    >
      {crestStrip.length > 0 ? (
        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-emerald-300/90">
            Este mes
          </span>
          <div className="flex items-center gap-1.5">
            {crestStrip.map((team) => (
              <TeamCrest
                key={team.name}
                name={team.name}
                crest={team.crest}
                size="sm"
                className="h-7 w-7 rounded-full bg-background/40 p-0.5 ring-1 ring-border/60"
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {weekdayLabels().map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {grid.map((cell, idx) => {
          if (cell.kind === 'pad') {
            return <div key={`pad-${idx}`} className="aspect-square" aria-hidden />;
          }

          const has = cell.count > 0;
          const selected = selectedDate === cell.date;
          const isToday = cell.date === todayKey;
          const preview = dayPreviews.get(cell.date);

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!has}
              aria-label={
                has
                  ? `${cell.day}: ${cell.count} ${cell.count === 1 ? 'Capsule' : 'Capsules'}`
                  : `${cell.day}: sin Capsules`
              }
              aria-pressed={has ? selected : undefined}
              onClick={() => onSelectDay(cell.date, cell.count)}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition-colors',
                calendarDayHeatClass(cell.count),
                has && 'cursor-pointer',
                !has && 'cursor-default',
                selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                isToday && !selected && 'outline outline-1 outline-primary/50',
              )}
            >
              <span className="text-[11px] font-medium tabular-nums leading-none sm:text-xs">
                {cell.day}
              </span>
              {has && preview ? (
                <span className="relative">
                  <TeamCrest
                    name={preview.name}
                    crest={preview.crest}
                    size="sm"
                    className="h-5 w-5 sm:h-6 sm:w-6"
                  />
                  {cell.count > 1 ? (
                    <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-primary-foreground">
                      {cell.count}
                    </span>
                  ) : null}
                </span>
              ) : has ? (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-transparent" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

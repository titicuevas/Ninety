import { computeCapsuleStats, formatRating } from '@/lib/capsuleStats';
import { formatCalendarMonthTitle } from '@/lib/diaryCalendar';
import type { Capsule } from '@/types/capsule';

type MonthShareCapsule = Pick<
  Capsule,
  | 'watched_at'
  | 'home_team_name'
  | 'away_team_name'
  | 'competition_name'
  | 'rating'
  | 'note'
  | 'photo_urls'
  | 'photo_url'
  | 'watch_context'
  | 'home_score'
  | 'away_score'
  | 'is_public'
>;

/**
 * Texto listo para copiar/compartir el mes del diario (one-tap).
 * Resume Capsules públicas del mes + enlace al calendario público.
 */
export function buildDiaryMonthShareText(opts: {
  name: string;
  year: number;
  month: number;
  capsules: MonthShareCapsule[];
  monthUrl: string;
}): string {
  const { name, year, month, monthUrl } = opts;
  const monthTitle = formatCalendarMonthTitle(year, month);
  const publicCapsules = opts.capsules.filter((c) => c.is_public !== false) as Capsule[];
  const stats = computeCapsuleStats(publicCapsules);
  const total = stats.totalMatches;

  const lines = [
    `📅 ${monthTitle} · Ninety`,
    name,
    '',
    total === 0
      ? 'Sin partidos públicos este mes'
      : `${total} partido${total === 1 ? '' : 's'} · media ${formatRating(stats.averageRating)}⭐`,
  ];

  if (stats.topTeam) lines.push(`Equipo top: ${stats.topTeam.name}`);
  if (stats.topCompetition) lines.push(`Competición: ${stats.topCompetition.name}`);
  if (stats.fiveStarCount > 0) lines.push(`5★: ${stats.fiveStarCount}`);
  if (stats.stadiumVisits > 0) {
    lines.push(
      `En el estadio: ${stats.stadiumVisits} partido${stats.stadiumVisits === 1 ? '' : 's'}`,
    );
  }
  if (stats.photosCount > 0) {
    lines.push(`${stats.photosCount} foto${stats.photosCount === 1 ? '' : 's'}`);
  }
  if (stats.bestRated) {
    lines.push(
      `Mejor partido: ${stats.bestRated.home_team_name} vs ${stats.bestRated.away_team_name}`,
    );
  }

  lines.push('', monthUrl.trim());
  return lines.join('\n');
}

import { formatCapsuleScore } from '@/lib/format';
import { publicCapsuleUrl } from '@/lib/siteUrl';

export type CapsuleShareSummary = {
  capsuleId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  competition?: string | null;
  rating?: number | null;
  note?: string | null;
  authorDisplayName?: string | null;
  authorUsername?: string | null;
};

export function capsuleShareSummaryFrom(
  capsule: {
    id: string;
    home_team_name: string;
    away_team_name: string;
    home_score?: number | null;
    away_score?: number | null;
    competition_name?: string | null;
    rating?: number | null;
    note?: string | null;
  },
  author?: { display_name?: string | null; username?: string | null } | null,
): CapsuleShareSummary {
  return {
    capsuleId: capsule.id,
    homeTeam: capsule.home_team_name,
    awayTeam: capsule.away_team_name,
    homeScore: capsule.home_score,
    awayScore: capsule.away_score,
    competition: capsule.competition_name,
    rating: capsule.rating,
    note: capsule.note,
    authorDisplayName: author?.display_name,
    authorUsername: author?.username,
  };
}

function formatShareRating(value: number): string {
  return Number.isInteger(value) ? `${value}★` : `${value.toFixed(1)}★`;
}

/**
 * Texto listo para copiar/compartir una Capsule pública (one-tap).
 * Resume partido, rating, nota y enlace.
 */
export function buildCapsuleShareText(summary: CapsuleShareSummary): string {
  const home = summary.homeTeam.trim() || 'Local';
  const away = summary.awayTeam.trim() || 'Visitante';
  const score = formatCapsuleScore(summary.homeScore, summary.awayScore);
  const match = score ? `${home} ${score} ${away}` : `${home} vs ${away}`;
  const url = summary.capsuleId ? publicCapsuleUrl(summary.capsuleId) : '';

  const author =
    summary.authorDisplayName?.trim() ||
    (summary.authorUsername?.trim() ? `@${summary.authorUsername.trim()}` : null);

  const lines = [`⚽ ${match} · Ninety`];
  if (author) lines.push(`Capsule de ${author}`);

  const details: string[] = [];
  const competition = summary.competition?.trim();
  if (competition) details.push(competition);

  if (summary.rating != null && Number.isFinite(summary.rating)) {
    details.push(formatShareRating(summary.rating));
  }

  const note = summary.note?.trim();
  if (note) {
    details.push(note.length > 120 ? `${note.slice(0, 119).trimEnd()}…` : note);
  }

  if (details.length > 0) {
    lines.push('', ...details);
  }

  if (url) lines.push('', url);
  return lines.join('\n');
}

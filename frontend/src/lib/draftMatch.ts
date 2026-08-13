import type { FootballMatch } from '@/types/football';

const DRAFT_MATCH_KEY = 'ninety.draftMatch:v1';
const LEGACY_DRAFT_MATCH_KEY = 'ninety.draftMatch';

function isFootballMatch(value: unknown): value is FootballMatch {
  if (!value || typeof value !== 'object') return false;
  const match = value as FootballMatch;
  return (
    typeof match.id === 'number' &&
    Number.isFinite(match.id) &&
    !!match.homeTeam &&
    typeof match.homeTeam.name === 'string' &&
    !!match.awayTeam &&
    typeof match.awayTeam.name === 'string'
  );
}

export function saveDraftMatch(match: FootballMatch): void {
  try {
    sessionStorage.setItem(DRAFT_MATCH_KEY, JSON.stringify(match));
    sessionStorage.removeItem(LEGACY_DRAFT_MATCH_KEY);
  } catch {
    /* storage lleno o bloqueado */
  }
}

export function readDraftMatch(): FootballMatch | null {
  try {
    const raw =
      sessionStorage.getItem(DRAFT_MATCH_KEY) ??
      sessionStorage.getItem(LEGACY_DRAFT_MATCH_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isFootballMatch(parsed)) return null;
    if (!sessionStorage.getItem(DRAFT_MATCH_KEY)) {
      sessionStorage.setItem(DRAFT_MATCH_KEY, raw);
      sessionStorage.removeItem(LEGACY_DRAFT_MATCH_KEY);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraftMatch(): void {
  try {
    sessionStorage.removeItem(DRAFT_MATCH_KEY);
    sessionStorage.removeItem(LEGACY_DRAFT_MATCH_KEY);
  } catch {
    /* ignore */
  }
}

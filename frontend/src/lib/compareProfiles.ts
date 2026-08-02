import { formatRating } from '@/lib/capsuleStats';
import { compareProfileUrl } from '@/lib/siteUrl';
import type { PublicProfileStats } from '@/types/publicProfile';

export type CompareSide = {
  username: string;
  displayName: string;
  stats: PublicProfileStats;
};

export type CompareMetricId =
  | 'matches'
  | 'rating'
  | 'stadium'
  | 'fiveStar'
  | 'photos';

export type CompareWinner = 'me' | 'them' | 'tie' | 'na';

export type CompareMetric = {
  id: CompareMetricId;
  label: string;
  meDisplay: string;
  themDisplay: string;
  winner: CompareWinner;
  /** Texto corto del delta cuando hay ganador numérico. */
  deltaLabel: string | null;
};

export type ProfileCompareResult = {
  metrics: CompareMetric[];
  sharedTeams: string[];
  headline: string;
  meWins: number;
  themWins: number;
  scoreLabel: string;
};

function teamNames(stats: PublicProfileStats): string[] {
  if (stats.topTeams && stats.topTeams.length > 0) {
    return stats.topTeams.map((t) => t.name);
  }
  return stats.topTeam?.name ? [stats.topTeam.name] : [];
}

function sharedTeamNames(me: PublicProfileStats, them: PublicProfileStats): string[] {
  const themSet = new Set(teamNames(them).map((n) => n.toLowerCase()));
  const seen = new Set<string>();
  const shared: string[] = [];
  for (const name of teamNames(me)) {
    const key = name.toLowerCase();
    if (!themSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    shared.push(name);
  }
  return shared;
}

function compareNumbers(
  me: number,
  them: number,
  opts?: { higherWins?: boolean; format?: (n: number) => string; decimals?: number },
): Pick<CompareMetric, 'winner' | 'deltaLabel' | 'meDisplay' | 'themDisplay'> {
  const higherWins = opts?.higherWins !== false;
  const fmt = opts?.format ?? ((n: number) => String(n));
  const decimals = opts?.decimals;
  let winner: CompareWinner = 'tie';
  if (me !== them) {
    const meAhead = me > them;
    winner = (higherWins ? meAhead : !meAhead) ? 'me' : 'them';
  }
  const rawDelta = Math.abs(me - them);
  const delta =
    decimals != null ? Number(rawDelta.toFixed(decimals)) : rawDelta;
  const deltaLabel =
    winner === 'tie'
      ? null
      : decimals != null
        ? `±${delta.toFixed(decimals)}`
        : `±${delta}`;
  return {
    meDisplay: fmt(me),
    themDisplay: fmt(them),
    winner,
    deltaLabel,
  };
}

function compareOptionalRatings(
  me: number | null,
  them: number | null,
): Pick<CompareMetric, 'winner' | 'deltaLabel' | 'meDisplay' | 'themDisplay'> {
  if (me == null && them == null) {
    return { meDisplay: '—', themDisplay: '—', winner: 'na', deltaLabel: null };
  }
  if (me == null) {
    return {
      meDisplay: '—',
      themDisplay: formatRating(them),
      winner: 'them',
      deltaLabel: null,
    };
  }
  if (them == null) {
    return {
      meDisplay: formatRating(me),
      themDisplay: '—',
      winner: 'me',
      deltaLabel: null,
    };
  }
  return compareNumbers(me, them, {
    format: (n) => formatRating(n),
    decimals: 1,
  });
}

export function buildProfileCompare(me: CompareSide, them: CompareSide): ProfileCompareResult {
  const metrics: CompareMetric[] = [
    {
      id: 'matches',
      label: 'Partidos',
      ...compareNumbers(me.stats.totalMatches, them.stats.totalMatches),
    },
    {
      id: 'rating',
      label: 'Media ★',
      ...compareOptionalRatings(me.stats.averageRating, them.stats.averageRating),
    },
    {
      id: 'stadium',
      label: 'En estadio',
      ...compareNumbers(me.stats.stadiumVisits ?? 0, them.stats.stadiumVisits ?? 0),
    },
    {
      id: 'fiveStar',
      label: 'Con 5★',
      ...compareNumbers(me.stats.fiveStarCount ?? 0, them.stats.fiveStarCount ?? 0),
    },
    {
      id: 'photos',
      label: 'Fotos',
      ...compareNumbers(me.stats.photosCount ?? 0, them.stats.photosCount ?? 0),
    },
  ];

  const meWins = metrics.filter((m) => m.winner === 'me').length;
  const themWins = metrics.filter((m) => m.winner === 'them').length;
  const sharedTeams = sharedTeamNames(me.stats, them.stats);

  let headline: string;
  if (me.stats.totalMatches === 0 && them.stats.totalMatches === 0) {
    headline = 'Los dos diarios están vacíos — hora de guardar un partido.';
  } else if (me.stats.totalMatches === 0) {
    headline = `El diario de ${them.displayName} ya tiene historia; el tuyo aún no.`;
  } else if (them.stats.totalMatches === 0) {
    headline = 'Vas por delante: su diario público aún está vacío.';
  } else if (meWins > themWins) {
    headline = `Vas por delante frente a ${them.displayName}.`;
  } else if (themWins > meWins) {
    headline = `${them.displayName} te supera en el cara a cara.`;
  } else {
    headline = 'Empate técnico — diarios muy parejos.';
  }

  if (sharedTeams.length > 0 && me.stats.totalMatches > 0 && them.stats.totalMatches > 0) {
    const teamsBit =
      sharedTeams.length === 1
        ? sharedTeams[0]
        : `${sharedTeams.slice(0, 2).join(' y ')}${sharedTeams.length > 2 ? '…' : ''}`;
    headline = `${headline} Os cruza ${teamsBit}.`;
  }

  const scoreLabel = `${meWins}–${themWins}`;

  return { metrics, sharedTeams, headline, meWins, themWins, scoreLabel };
}

export function buildCompareShareText(
  me: CompareSide,
  them: CompareSide,
  result: ProfileCompareResult,
): string {
  const lines = [
    `⚽ Cara a cara Ninety`,
    `${me.displayName} vs ${them.displayName}`,
    '',
    result.headline,
    `Marcador: ${result.scoreLabel}`,
  ];

  for (const metric of result.metrics) {
    if (metric.winner === 'na') continue;
    lines.push(`${metric.label}: ${metric.meDisplay} · ${metric.themDisplay}`);
  }

  if (result.sharedTeams.length > 0) {
    lines.push(`Equipos en común: ${result.sharedTeams.join(', ')}`);
  }

  if (me.stats.topTeam || them.stats.topTeam) {
    lines.push(
      `Top: ${me.stats.topTeam?.name ?? '—'} vs ${them.stats.topTeam?.name ?? '—'}`,
    );
  }

  lines.push('', compareProfileUrl(them.username));
  return lines.join('\n');
}

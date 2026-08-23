import { formatRating } from '@/lib/capsuleStats';
import { compareProfileUrl } from '@/lib/siteUrl';
import type { PublicProfileStats } from '@/types/publicProfile';

export type CompareSide = {
  username: string;
  displayName: string;
  stats: PublicProfileStats;
  avatarUrl?: string | null;
};

type CompareMetricId =
  | 'matches'
  | 'rating'
  | 'stadium'
  | 'fiveStar'
  | 'photos';

type CompareWinner = 'me' | 'them' | 'tie' | 'na';

export type CompareMetric = {
  id: CompareMetricId;
  label: string;
  meDisplay: string;
  themDisplay: string;
  /** Valor numérico para barras de proporción (0 si no aplica / na). */
  meValue: number;
  themValue: number;
  winner: CompareWinner;
  /** Texto corto del delta cuando hay ganador numérico. */
  deltaLabel: string | null;
};

export type ProfileCompareResult = {
  metrics: CompareMetric[];
  sharedTeams: string[];
  /** Copy cuando no hay solape de equipos (UI empty state). */
  sharedTeamsEmpty: string;
  headline: string;
  meWins: number;
  themWins: number;
  scoreLabel: string;
};

/** Porcentajes 0–100 para una barra compartida me | them. Empate visual si ambos son 0. */
export function metricBarPercents(meValue: number, themValue: number): {
  mePct: number;
  themPct: number;
} {
  const me = Math.max(0, meValue);
  const them = Math.max(0, themValue);
  const total = me + them;
  if (total <= 0) return { mePct: 50, themPct: 50 };
  const mePct = Math.round((me / total) * 1000) / 10;
  return { mePct, themPct: Math.round((100 - mePct) * 10) / 10 };
}

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
): Pick<CompareMetric, 'winner' | 'deltaLabel' | 'meDisplay' | 'themDisplay' | 'meValue' | 'themValue'> {
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
    meValue: me,
    themValue: them,
    winner,
    deltaLabel,
  };
}

function compareOptionalRatings(
  me: number | null,
  them: number | null,
): Pick<CompareMetric, 'winner' | 'deltaLabel' | 'meDisplay' | 'themDisplay' | 'meValue' | 'themValue'> {
  if (me == null && them == null) {
    return {
      meDisplay: '—',
      themDisplay: '—',
      meValue: 0,
      themValue: 0,
      winner: 'na',
      deltaLabel: null,
    };
  }
  if (me == null) {
    return {
      meDisplay: '—',
      themDisplay: formatRating(them),
      meValue: 0,
      themValue: them ?? 0,
      winner: 'them',
      deltaLabel: null,
    };
  }
  if (them == null) {
    return {
      meDisplay: formatRating(me),
      themDisplay: '—',
      meValue: me,
      themValue: 0,
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

  let sharedTeamsEmpty: string;
  if (me.stats.totalMatches === 0 && them.stats.totalMatches === 0) {
    sharedTeamsEmpty = 'Cuando guardéis partidos, aquí veréis equipos en común.';
  } else if (me.stats.totalMatches === 0 || them.stats.totalMatches === 0) {
    sharedTeamsEmpty = 'Falta diario en un lado para cruzar equipos.';
  } else {
    sharedTeamsEmpty = 'Sin equipos en común en vuestros tops — gustos distintos.';
  }

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

  return {
    metrics,
    sharedTeams,
    sharedTeamsEmpty,
    headline,
    meWins,
    themWins,
    scoreLabel,
  };
}

export function buildCompareShareText(
  me: CompareSide,
  them: CompareSide,
  result: ProfileCompareResult,
  inCommonCount = 0,
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

  if (inCommonCount > 0) {
    lines.push(
      `Partidos en común: ${inCommonCount}`,
    );
  }

  if (result.sharedTeams.length > 0) {
    lines.push(`Equipos en común: ${result.sharedTeams.join(', ')}`);
  } else {
    lines.push(`Equipos en común: ${result.sharedTeamsEmpty}`);
  }

  if (me.stats.topTeam || them.stats.topTeam) {
    lines.push(
      `Top: ${me.stats.topTeam?.name ?? '—'} vs ${them.stats.topTeam?.name ?? '—'}`,
    );
  }

  lines.push('', compareProfileUrl(them.username));
  return lines.join('\n');
}

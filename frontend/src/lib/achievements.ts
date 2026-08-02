import { isWatchContext } from '@/lib/watchContext';

/** Iconos soportados por AchievementsSection (lucide). */
export type AchievementIcon =
  | 'ticket'
  | 'flame'
  | 'star'
  | 'landmark'
  | 'camera'
  | 'pen'
  | 'layers'
  | 'userPlus'
  | 'users';

export type AchievementId =
  | 'first_capsule'
  | 'matches_5'
  | 'matches_10'
  | 'matches_25'
  | 'five_star'
  | 'five_star_5'
  | 'stadium'
  | 'stadium_5'
  | 'photographer'
  | 'photographer_5'
  | 'chronicler'
  | 'streak_3'
  | 'streak_7'
  | 'versatile'
  | 'social'
  | 'popular';

/**
 * Snapshot on-read. Campos opcionales se omiten del catálogo si no aplican
 * (p. ej. notas/racha en perfil público sin ese dato).
 */
export type AchievementsInput = {
  totalMatches: number;
  fiveStarCount: number;
  stadiumVisits: number;
  photosCount: number;
  notesCount?: number;
  longestStreak?: number;
  distinctWatchContexts?: number;
  followingCount?: number;
  followersCount?: number;
};

export type AchievementDef = {
  id: AchievementId;
  title: string;
  description: string;
  icon: AchievementIcon;
  threshold: number;
  /** null = no se muestra (métrica no disponible en este contexto). */
  value: (input: AchievementsInput) => number | null;
};

export type AchievementResult = {
  id: AchievementId;
  title: string;
  description: string;
  icon: AchievementIcon;
  unlocked: boolean;
  progress: number;
  threshold: number;
};

export const ACHIEVEMENT_CATALOG: readonly AchievementDef[] = [
  {
    id: 'first_capsule',
    title: 'Primera Capsule',
    description: 'Guarda tu primer partido',
    icon: 'ticket',
    threshold: 1,
    value: (i) => i.totalMatches,
  },
  {
    id: 'matches_5',
    title: 'Aficionado',
    description: '5 partidos en el diario',
    icon: 'ticket',
    threshold: 5,
    value: (i) => i.totalMatches,
  },
  {
    id: 'matches_10',
    title: 'Habitual',
    description: '10 partidos en el diario',
    icon: 'ticket',
    threshold: 10,
    value: (i) => i.totalMatches,
  },
  {
    id: 'matches_25',
    title: 'Diario vivo',
    description: '25 partidos en el diario',
    icon: 'ticket',
    threshold: 25,
    value: (i) => i.totalMatches,
  },
  {
    id: 'five_star',
    title: 'Obra maestra',
    description: 'Valora un partido con 5★',
    icon: 'star',
    threshold: 1,
    value: (i) => i.fiveStarCount,
  },
  {
    id: 'five_star_5',
    title: 'Exigente',
    description: '5 partidos con 5★',
    icon: 'star',
    threshold: 5,
    value: (i) => i.fiveStarCount,
  },
  {
    id: 'stadium',
    title: 'A la grada',
    description: 'Un partido en estadio',
    icon: 'landmark',
    threshold: 1,
    value: (i) => i.stadiumVisits,
  },
  {
    id: 'stadium_5',
    title: 'Habitante del campo',
    description: '5 partidos en estadio',
    icon: 'landmark',
    threshold: 5,
    value: (i) => i.stadiumVisits,
  },
  {
    id: 'photographer',
    title: 'Fotógrafo',
    description: 'Añade una foto a una Capsule',
    icon: 'camera',
    threshold: 1,
    value: (i) => i.photosCount,
  },
  {
    id: 'photographer_5',
    title: 'Álbum lleno',
    description: '5 fotos en el diario',
    icon: 'camera',
    threshold: 5,
    value: (i) => i.photosCount,
  },
  {
    id: 'chronicler',
    title: 'Cronista',
    description: '5 notas escritas',
    icon: 'pen',
    threshold: 5,
    value: (i) => i.notesCount ?? null,
  },
  {
    id: 'streak_3',
    title: 'Racha',
    description: '3 días seguidos con partido',
    icon: 'flame',
    threshold: 3,
    value: (i) => i.longestStreak ?? null,
  },
  {
    id: 'streak_7',
    title: 'Imparable',
    description: '7 días seguidos con partido',
    icon: 'flame',
    threshold: 7,
    value: (i) => i.longestStreak ?? null,
  },
  {
    id: 'versatile',
    title: 'Versátil',
    description: '3 contextos de visionado distintos',
    icon: 'layers',
    threshold: 3,
    value: (i) => i.distinctWatchContexts ?? null,
  },
  {
    id: 'social',
    title: 'Conectado',
    description: 'Sigue a otro aficionado',
    icon: 'userPlus',
    threshold: 1,
    value: (i) => i.followingCount ?? null,
  },
  {
    id: 'popular',
    title: 'Referencia',
    description: '5 seguidores',
    icon: 'users',
    threshold: 5,
    value: (i) => i.followersCount ?? null,
  },
] as const;

export function countDistinctWatchContexts(
  capsules: Array<{ watch_context?: string | null }>,
): number {
  const seen = new Set<string>();
  for (const capsule of capsules) {
    if (isWatchContext(capsule.watch_context)) seen.add(capsule.watch_context);
  }
  return seen.size;
}

type StatsLike = {
  totalMatches: number;
  fiveStarCount: number;
  stadiumVisits: number;
  photosCount: number;
  notesCount?: number;
  longestStreak?: number;
};

/** Construye el snapshot desde CapsuleStats (Home / Wrapped). */
export function achievementsInputFromStats(
  stats: StatsLike,
  options?: {
    capsules?: Array<{ watch_context?: string | null }>;
    followingCount?: number;
    followersCount?: number;
  },
): AchievementsInput {
  const input: AchievementsInput = {
    totalMatches: stats.totalMatches,
    fiveStarCount: stats.fiveStarCount,
    stadiumVisits: stats.stadiumVisits,
    photosCount: stats.photosCount,
  };
  if (stats.notesCount != null) input.notesCount = stats.notesCount;
  if (stats.longestStreak != null) input.longestStreak = stats.longestStreak;
  if (options?.capsules) {
    input.distinctWatchContexts = countDistinctWatchContexts(options.capsules);
  }
  if (options?.followingCount != null) input.followingCount = options.followingCount;
  if (options?.followersCount != null) input.followersCount = options.followersCount;
  return input;
}

/** Snapshot desde stats públicas (sin notas/racha/contextos). */
export function achievementsInputFromPublicStats(
  stats: Pick<StatsLike, 'totalMatches' | 'fiveStarCount' | 'stadiumVisits' | 'photosCount'>,
  social?: { followingCount?: number; followersCount?: number },
): AchievementsInput {
  return achievementsInputFromStats(stats, social);
}

export function computeAchievements(input: AchievementsInput): AchievementResult[] {
  const results: AchievementResult[] = [];
  for (const def of ACHIEVEMENT_CATALOG) {
    const raw = def.value(input);
    if (raw == null) continue;
    const progress = Math.max(0, raw);
    results.push({
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      threshold: def.threshold,
      progress,
      unlocked: progress >= def.threshold,
    });
  }
  return results;
}

export function countUnlockedAchievements(achievements: AchievementResult[]): number {
  return achievements.filter((a) => a.unlocked).length;
}

/** Campos seguros de una Capsule para export GDPR (sin secretos ni user_id interno). */
export type ExportCapsule = {
  id: string;
  match_id: number;
  match_played_at: string | null;
  home_team_name: string;
  away_team_name: string;
  home_team_crest: string | null;
  away_team_crest: string | null;
  competition_name: string | null;
  home_score: number | null;
  away_score: number | null;
  watched_at: string;
  rating: number | null;
  note: string | null;
  photo_urls: string[];
  is_public: boolean;
  watch_context: string | null;
  created_at: string;
  updated_at: string;
};

export type DiaryExportPayload = {
  exported_at: string;
  format_version: 1;
  profile: {
    username: string | null;
    display_name: string | null;
  };
  capsules: ExportCapsule[];
};

const CSV_COLUMNS = [
  'id',
  'match_id',
  'match_played_at',
  'home_team_name',
  'away_team_name',
  'competition_name',
  'home_score',
  'away_score',
  'watched_at',
  'rating',
  'note',
  'photo_urls',
  'is_public',
  'watch_context',
  'created_at',
  'updated_at',
] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellValue(capsule: ExportCapsule, key: (typeof CSV_COLUMNS)[number]): string {
  const raw = capsule[key];
  if (raw == null) return '';
  if (Array.isArray(raw)) return raw.join(' | ');
  if (typeof raw === 'boolean') return raw ? 'true' : 'false';
  return String(raw);
}

export function toExportCapsule(row: Record<string, unknown>): ExportCapsule {
  return {
    id: String(row.id ?? ''),
    match_id: Number(row.match_id ?? 0),
    match_played_at: (row.match_played_at as string | null) ?? null,
    home_team_name: String(row.home_team_name ?? ''),
    away_team_name: String(row.away_team_name ?? ''),
    home_team_crest: (row.home_team_crest as string | null) ?? null,
    away_team_crest: (row.away_team_crest as string | null) ?? null,
    competition_name: (row.competition_name as string | null) ?? null,
    home_score: (row.home_score as number | null) ?? null,
    away_score: (row.away_score as number | null) ?? null,
    watched_at: String(row.watched_at ?? ''),
    rating: (row.rating as number | null) ?? null,
    note: (row.note as string | null) ?? null,
    photo_urls: Array.isArray(row.photo_urls) ? (row.photo_urls as string[]) : [],
    is_public: row.is_public !== false,
    watch_context: (row.watch_context as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

export function buildDiaryExportJson(payload: DiaryExportPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function buildDiaryExportCsv(capsules: ExportCapsule[]): string {
  const header = CSV_COLUMNS.join(',');
  const lines = capsules.map((capsule) =>
    CSV_COLUMNS.map((col) => csvEscape(cellValue(capsule, col))).join(','),
  );
  return `${[header, ...lines].join('\n')}\n`;
}

import { z } from 'zod';
import { CAPSULE_NOTE_MAX, normalizeCapsuleNote } from './capsuleNote.js';
import {
  CAPSULE_TAGS_MAX,
  CAPSULE_TAG_MAX_LEN,
  normalizeCapsuleTags,
} from './capsuleTags.js';

/** Límite duro por petición (abuso + payload). */
export const DIARY_IMPORT_MAX_CAPSULES = 500;
export const MAX_SOURCE_PHOTOS_PER_CAPSULE = 9;

/** Acepta exports antiguos (DB ≤ 2000) y normaliza al límite de reseña corta. */
const IMPORT_NOTE_MAX = Math.max(2000, CAPSULE_NOTE_MAX);

const watchContextSchema = z.enum(['stadium', 'tv', 'pub', 'other']).nullable().optional();

const importCapsuleSchema = z.object({
  /** Positivo = football-data; negativo = partido manual. */
  match_id: z.coerce.number().int().refine((n) => n !== 0, 'match_id no puede ser 0'),
  match_played_at: z.string().min(1).max(64).nullable().optional(),
  home_team_name: z.string().min(1).max(200),
  away_team_name: z.string().min(1).max(200),
  // Crests: no usar z.url() estricto — URLs raras del export no deben tumbar la Capsule.
  home_team_crest: z.string().max(2048).nullable().optional(),
  away_team_crest: z.string().max(2048).nullable().optional(),
  competition_name: z.string().max(200).nullable().optional(),
  home_score: z.number().int().min(0).max(99).nullable().optional(),
  away_score: z.number().int().min(0).max(99).nullable().optional(),
  watched_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'watched_at debe ser YYYY-MM-DD'),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  note: z.string().max(IMPORT_NOTE_MAX).nullable().optional(),
  tags: z.array(z.string().max(CAPSULE_TAG_MAX_LEN)).max(CAPSULE_TAGS_MAX).optional(),
  is_public: z.boolean().optional(),
  watch_context: watchContextSchema,
  photo_urls: z.array(z.string().max(2048)).max(9).optional(),
});

const diaryImportPayloadSchema = z.object({
  format_version: z.literal(1),
  capsules: z.array(z.unknown()).max(DIARY_IMPORT_MAX_CAPSULES),
  restore_photos: z.boolean().optional(),
});

export type DiaryImportRow = {
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
  tags: string[];
  /** Siempre vacío al insertar; se rellena tras restaurar fotos opcionales. */
  photo_urls: string[];
  /** URLs del export cuando `restore_photos` está activo. */
  source_photo_urls: string[];
  is_public: boolean;
  watch_context: 'stadium' | 'tv' | 'pub' | 'other' | null;
};

export type DiaryImportParseResult =
  | {
      ok: true;
      rows: DiaryImportRow[];
      skipped_invalid: number;
      skipped_duplicate_in_file: number;
      restore_photos: boolean;
    }
  | { ok: false; error: string };

export type DiaryImportSummary = {
  imported: number;
  skipped_duplicate: number;
  skipped_invalid: number;
  skipped_duplicate_in_file: number;
  total_in_file: number;
  photos_restored?: number;
  photos_failed?: number;
  photos_skipped_limit?: number;
  capsules_with_photos?: number;
};

export function optionalHttpUrl(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return value;
  } catch {
    return null;
  }
}

/** Normaliza `photo_urls` del export: http(s), dedupe, máx. 9. */
export function normalizeSourcePhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const url = optionalHttpUrl(item.trim());
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= MAX_SOURCE_PHOTOS_PER_CAPSULE) break;
  }

  return out;
}

function normalizeMatchPlayedAt(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const ms = Date.parse(value.trim());
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export type ToImportRowOptions = {
  restorePhotos?: boolean;
};

/** Normaliza una Capsule del export JSON a fila insertable. */
export function toImportRow(raw: unknown, options?: ToImportRowOptions): DiaryImportRow | null {
  const parsed = importCapsuleSchema.safeParse(raw);
  if (!parsed.success) return null;

  const c = parsed.data;
  const sourcePhotoUrls = options?.restorePhotos ? normalizeSourcePhotoUrls(c.photo_urls) : [];

  return {
    match_id: c.match_id,
    match_played_at: normalizeMatchPlayedAt(c.match_played_at ?? null),
    home_team_name: c.home_team_name.trim(),
    away_team_name: c.away_team_name.trim(),
    home_team_crest: optionalHttpUrl(c.home_team_crest ?? null),
    away_team_crest: optionalHttpUrl(c.away_team_crest ?? null),
    competition_name: c.competition_name?.trim() || null,
    home_score: c.home_score ?? null,
    away_score: c.away_score ?? null,
    watched_at: c.watched_at,
    rating: c.rating ?? null,
    note: normalizeCapsuleNote(c.note),
    tags: normalizeCapsuleTags(c.tags),
    photo_urls: [],
    source_photo_urls: sourcePhotoUrls,
    is_public: c.is_public !== false,
    watch_context: c.watch_context ?? null,
  };
}

/**
 * Valida el payload de export Ninety (`format_version: 1`) y prepara filas.
 * Dedup interno por match_id; fotos opcionales vía `restore_photos`.
 */
export function parseDiaryImportPayload(raw: unknown): DiaryImportParseResult {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'JSON inválido: se esperaba un objeto de export Ninety.' };
  }

  if ((raw as { format_version?: unknown }).format_version !== 1) {
    return {
      ok: false,
      error: 'Solo se admite format_version 1 (export JSON de Ninety desde Ajustes).',
    };
  }

  const envelope = diaryImportPayloadSchema.safeParse(raw);
  if (!envelope.success) {
    const issue = envelope.error.issues[0];
    if (issue?.code === 'too_big') {
      return {
        ok: false,
        error: `Demasiadas Capsules (máximo ${DIARY_IMPORT_MAX_CAPSULES} por import).`,
      };
    }
    return { ok: false, error: `JSON de export inválido: ${issue?.message ?? 'formato inválido'}` };
  }

  const restorePhotos = envelope.data.restore_photos === true;
  const seen = new Set<number>();
  const rows: DiaryImportRow[] = [];
  let skipped_invalid = 0;
  let skipped_duplicate_in_file = 0;

  for (const item of envelope.data.capsules) {
    const row = toImportRow(item, { restorePhotos });
    if (!row) {
      skipped_invalid += 1;
      continue;
    }
    if (seen.has(row.match_id)) {
      skipped_duplicate_in_file += 1;
      continue;
    }
    seen.add(row.match_id);
    rows.push(row);
  }

  return { ok: true, rows, skipped_invalid, skipped_duplicate_in_file, restore_photos: restorePhotos };
}

export function buildImportSummary(params: DiaryImportSummary): DiaryImportSummary {
  return { ...params };
}

/** Un solo mensaje para la UI (sin spam por Capsule). */
export function formatDiaryImportSummary(summary: DiaryImportSummary): string {
  const parts = [`Importadas: ${summary.imported}`];
  if (summary.skipped_duplicate > 0) {
    parts.push(`ya en el diario: ${summary.skipped_duplicate}`);
  }
  if (summary.skipped_duplicate_in_file > 0) {
    parts.push(`duplicadas en archivo: ${summary.skipped_duplicate_in_file}`);
  }
  if (summary.skipped_invalid > 0) {
    parts.push(`inválidas omitidas: ${summary.skipped_invalid}`);
  }
  if (summary.photos_restored != null && summary.photos_restored > 0) {
    parts.push(`fotos restauradas: ${summary.photos_restored}`);
  }
  if (summary.photos_failed != null && summary.photos_failed > 0) {
    parts.push(`fotos no recuperadas: ${summary.photos_failed}`);
  }
  if (summary.photos_skipped_limit != null && summary.photos_skipped_limit > 0) {
    parts.push(`fotos omitidas por límite: ${summary.photos_skipped_limit}`);
  }
  parts.push(`en archivo: ${summary.total_in_file}`);
  return parts.join(' · ');
}

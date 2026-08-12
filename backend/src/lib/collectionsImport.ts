import { z } from 'zod';
import { slugifyCollectionName } from './collectionSlug.js';

/** Alineado con MAX_COLLECTIONS_PER_USER en routes/collections. */
export const COLLECTIONS_IMPORT_MAX = 50;
/** Alineado con MAX_ITEMS_PER_COLLECTION. */
export const COLLECTIONS_IMPORT_MAX_ITEMS = 100;

const nonzeroMatchId = z.coerce.number().int().refine((n) => n !== 0, 'match_id no puede ser 0');

const importItemSchema = z.object({
  match_id: nonzeroMatchId,
  position: z.coerce.number().int().min(0).max(10_000).optional(),
});

const importCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(500).nullable().optional(),
  is_public: z.boolean().optional(),
  cover_match_id: nonzeroMatchId.nullable().optional(),
  items: z.array(z.unknown()).max(COLLECTIONS_IMPORT_MAX_ITEMS).optional(),
});

const collectionsImportPayloadSchema = z.object({
  format_version: z.literal(1),
  kind: z.literal('collections'),
  collections: z.array(z.unknown()).max(COLLECTIONS_IMPORT_MAX),
});

export type CollectionsImportItem = {
  match_id: number;
  position: number;
};

export type CollectionsImportRow = {
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  cover_match_id: number | null;
  items: CollectionsImportItem[];
};

export type CollectionsImportParseResult =
  | {
      ok: true;
      rows: CollectionsImportRow[];
      skipped_invalid: number;
      skipped_duplicate_in_file: number;
      skipped_invalid_items: number;
    }
  | { ok: false; error: string };

export type CollectionsImportSummary = {
  imported: number;
  skipped_duplicate: number;
  skipped_invalid: number;
  skipped_duplicate_in_file: number;
  skipped_invalid_items: number;
  skipped_missing_capsule: number;
  skipped_limit: number;
  items_linked: number;
  total_in_file: number;
};

export function toImportCollection(raw: unknown): {
  row: CollectionsImportRow | null;
  skipped_invalid_items: number;
} {
  const parsed = importCollectionSchema.safeParse(raw);
  if (!parsed.success) {
    return { row: null, skipped_invalid_items: 0 };
  }

  const c = parsed.data;
  const desiredSlug = c.slug ?? slugifyCollectionName(c.name);
  const slug = slugifyCollectionName(desiredSlug);

  const seen = new Set<number>();
  const items: CollectionsImportItem[] = [];
  let skipped_invalid_items = 0;

  for (const [index, itemRaw] of (c.items ?? []).entries()) {
    const item = importItemSchema.safeParse(itemRaw);
    if (!item.success) {
      skipped_invalid_items += 1;
      continue;
    }
    if (seen.has(item.data.match_id)) {
      skipped_invalid_items += 1;
      continue;
    }
    seen.add(item.data.match_id);
    items.push({
      match_id: item.data.match_id,
      position: item.data.position ?? index,
    });
  }

  items.sort((a, b) => a.position - b.position || a.match_id - b.match_id);
  const normalized = items.map((item, index) => ({ ...item, position: index }));

  const cover =
    c.cover_match_id != null && normalized.some((item) => item.match_id === c.cover_match_id)
      ? c.cover_match_id
      : null;

  return {
    row: {
      name: c.name.trim(),
      slug,
      description: c.description?.trim() || null,
      is_public: c.is_public !== false,
      cover_match_id: cover,
      items: normalized,
    },
    skipped_invalid_items,
  };
}

/**
 * Valida export de colecciones Ninety (`kind: "collections"`, `format_version: 1`).
 * Dedup interno por slug; ítems por match_id.
 */
export function parseCollectionsImportPayload(raw: unknown): CollectionsImportParseResult {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'JSON inválido: se esperaba un objeto de export de colecciones.' };
  }

  const obj = raw as { format_version?: unknown; kind?: unknown; capsules?: unknown };

  if (obj.format_version !== 1) {
    return {
      ok: false,
      error: 'Solo se admite format_version 1 (export JSON de colecciones desde Ajustes).',
    };
  }

  if (obj.kind !== 'collections') {
    if (Array.isArray(obj.capsules)) {
      return {
        ok: false,
        error:
          'Este archivo es un export del diario. Usa «Importar JSON» en Exportar e importar diario.',
      };
    }
    return {
      ok: false,
      error: 'Solo se admite kind "collections" (export de colecciones desde Ajustes).',
    };
  }

  const envelope = collectionsImportPayloadSchema.safeParse(raw);
  if (!envelope.success) {
    const issue = envelope.error.issues[0];
    if (issue?.code === 'too_big') {
      return {
        ok: false,
        error: `Demasiadas colecciones (máximo ${COLLECTIONS_IMPORT_MAX} por import).`,
      };
    }
    return { ok: false, error: `JSON de export inválido: ${issue?.message ?? 'formato inválido'}` };
  }

  const seenSlugs = new Set<string>();
  const rows: CollectionsImportRow[] = [];
  let skipped_invalid = 0;
  let skipped_duplicate_in_file = 0;
  let skipped_invalid_items = 0;

  for (const item of envelope.data.collections) {
    const { row, skipped_invalid_items: itemSkips } = toImportCollection(item);
    skipped_invalid_items += itemSkips;
    if (!row) {
      skipped_invalid += 1;
      continue;
    }
    if (seenSlugs.has(row.slug)) {
      skipped_duplicate_in_file += 1;
      continue;
    }
    seenSlugs.add(row.slug);
    rows.push(row);
  }

  return {
    ok: true,
    rows,
    skipped_invalid,
    skipped_duplicate_in_file,
    skipped_invalid_items,
  };
}

export function buildCollectionsImportSummary(
  params: CollectionsImportSummary,
): CollectionsImportSummary {
  return { ...params };
}

/** Un solo mensaje para la UI (sin spam por colección). */
export function formatCollectionsImportSummary(summary: CollectionsImportSummary): string {
  const parts = [`Importadas: ${summary.imported}`];
  if (summary.items_linked > 0) {
    parts.push(`ítems enlazados: ${summary.items_linked}`);
  }
  if (summary.skipped_duplicate > 0) {
    parts.push(`ya existían: ${summary.skipped_duplicate}`);
  }
  if (summary.skipped_duplicate_in_file > 0) {
    parts.push(`duplicadas en archivo: ${summary.skipped_duplicate_in_file}`);
  }
  if (summary.skipped_invalid > 0) {
    parts.push(`inválidas omitidas: ${summary.skipped_invalid}`);
  }
  if (summary.skipped_invalid_items > 0) {
    parts.push(`ítems inválidos: ${summary.skipped_invalid_items}`);
  }
  if (summary.skipped_missing_capsule > 0) {
    parts.push(`sin Capsule en diario: ${summary.skipped_missing_capsule}`);
  }
  if (summary.skipped_limit > 0) {
    parts.push(`límite de colecciones: ${summary.skipped_limit}`);
  }
  parts.push(`en archivo: ${summary.total_in_file}`);
  return parts.join(' · ');
}

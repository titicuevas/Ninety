/** Máx. etiquetas por Capsule (alineado con backend / DB). */
export const CAPSULE_TAGS_MAX = 8;
/** Longitud máxima por etiqueta. */
export const CAPSULE_TAG_MAX_LEN = 24;

/** Sugerencias rápidas en crear/editar. */
export const CAPSULE_TAG_SUGGESTIONS = [
  'clásico',
  'viaje',
  'derbi',
  'final',
  'amistoso',
] as const;

const TAG_RE = /^[\p{L}\p{N}][\p{L}\p{N} -]{0,23}$/u;

export function normalizeCapsuleTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const tag = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!tag || tag.length > CAPSULE_TAG_MAX_LEN) return null;
  if (!TAG_RE.test(tag)) return null;
  return tag;
}

export function normalizeCapsuleTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of value) {
    const tag = normalizeCapsuleTag(item);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= CAPSULE_TAGS_MAX) break;
  }

  return out;
}

/** Etiquetas únicas del diario, orden alfabético (chips de filtro). */
export function listCapsuleTags(capsules: ReadonlyArray<{ tags?: string[] | null }>): string[] {
  const seen = new Set<string>();
  for (const capsule of capsules) {
    for (const raw of capsule.tags ?? []) {
      const tag = normalizeCapsuleTag(raw);
      if (tag) seen.add(tag);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'es'));
}

export function parseTagFilter(value: string | null): string | undefined {
  if (!value) return undefined;
  return normalizeCapsuleTag(value) ?? undefined;
}

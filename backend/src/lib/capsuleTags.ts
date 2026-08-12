/** Máx. etiquetas por Capsule (alineado con check DB). */
export const CAPSULE_TAGS_MAX = 8;
/** Longitud máxima por etiqueta. */
export const CAPSULE_TAG_MAX_LEN = 24;

const TAG_RE = /^[\p{L}\p{N}][\p{L}\p{N} -]{0,23}$/u;

/** Normaliza una etiqueta suelta: trim, minúsculas, espacios colapsados. */
export function normalizeCapsuleTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const tag = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!tag || tag.length > CAPSULE_TAG_MAX_LEN) return null;
  if (!TAG_RE.test(tag)) return null;
  return tag;
}

/** Dedup + límite; valores inválidos se omiten. */
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

/** Query param `tag` para filtrar Mis Capsules. */
export function parseCapsuleTagFilter(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'string') return undefined;
  return normalizeCapsuleTag(value) ?? undefined;
}

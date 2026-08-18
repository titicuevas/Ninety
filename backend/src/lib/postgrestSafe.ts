/** UUID v1–v8 (Supabase usa v4). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function onlyUuids(ids: Iterable<string>): string[] {
  return [...ids].filter(isUuid);
}

/** Lista `(uuid,uuid)` para `.in` / `.not(..., 'in', ...)` de PostgREST. */
export function postgrestInList(ids: Iterable<string>): string | null {
  const safe = onlyUuids(ids);
  if (safe.length === 0) return null;
  return `(${safe.join(',')})`;
}

/**
 * Texto para `ilike` / `.or(...)`: quita comodines y puntuación de filtros PostgREST.
 * No es un escape SQL (Supabase parametriza); evita romper el DSL de filtros.
 */
export function sanitizePostgrestSearch(raw: string | undefined, max = 100): string {
  return (raw ?? '')
    .toLowerCase()
    .replace(/[%_,."'()\\;:=*]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Quita etiquetas HTML; deja "2 < 3" intacto. */
export function stripHtmlTags(value: string): string {
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

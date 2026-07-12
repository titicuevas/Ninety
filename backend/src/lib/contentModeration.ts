const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Normaliza texto para detectar insultos disfrazados (mayúsculas, acentos, leetspeak). */
export function normalizeForModeration(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[@4]/g, 'a')
    .replace(/[3€]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7+]/g, 't')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Patrones de lenguaje ofensivo / insultos (español).
 * No bloquea debate futbolero; sí insultos directos y slurs frecuentes.
 */
const BLOCKED_PATTERNS: RegExp[] = [
  /\bput[ao]s?\b/,
  /\bhij[ao]s?\s+de\s+puta\b/,
  /\bhdp\b/,
  /\bcabron[aes]?\b/,
  /\bgilipollas?\b/,
  /\bimbecil(es)?\b/,
  /\bidiotas?\b/,
  /\bmierda\b/,
  /\bjoder\b/,
  /\bcojones?\b/,
  /\bcoño\b/,
  /\bmaric[óo]n(es)?\b/,
  /\bmarica\b/,
  /\bsubnormal(es)?\b/,
  /\bretrasad[oa]s?\b/,
  /\bmalparid[oa]s?\b/,
  /\bhp\b/,
  /\bctm\b/,
  /\bpendej[oa]s?\b/,
  /\bbolud[oa]s?\b/,
  /\bforr[oa]s?\b/,
  /\bchupame\b/,
  /\bvete\s+a\s+la\s+mierda\b/,
  /\bque\s+te\s+jodan\b/,
  /\bfuck\s*(you|off|u)\b/,
  /\bshit\b/,
  /\bbitch(es)?\b/,
  /\basshole(s)?\b/,
  /\bnigg[ae]r(s)?\b/,
  /\bfaggot(s)?\b/,
];

export function containsBlockedLanguage(text: string): boolean {
  const normalized = normalizeForModeration(text);
  if (!normalized) return false;

  const compact = normalized.replace(/\s/g, '');

  return BLOCKED_PATTERNS.some(
    (pattern) => pattern.test(normalized) || pattern.test(compact),
  );
}

export function validateCommentBody(body: string): string | null {
  if (containsBlockedLanguage(body)) {
    return 'El comentario incluye lenguaje ofensivo. Mantén el respeto entre aficionados.';
  }
  return null;
}

export function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length < 3) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (buffer.length < 12) return null;

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export function validateImageBuffer(buffer: Buffer, declaredMime: string): string | null {
  if (!ALLOWED_IMAGE_MIMES.has(declaredMime)) {
    return 'Solo se permiten fotos JPG, PNG o WebP.';
  }

  if (buffer.length < 100) {
    return 'El archivo no parece una imagen válida.';
  }

  const detected = detectImageMime(buffer);
  if (!detected) {
    return 'El archivo no es una imagen válida. Solo JPG, PNG o WebP.';
  }

  if (detected !== declaredMime) {
    return 'El tipo de archivo no coincide con su contenido.';
  }

  return null;
}

export const PHOTO_CONTENT_POLICY =
  'Solo fotos del partido, estadio o experiencia futbolera. Prohibido contenido sexual, desnudos o violento.';

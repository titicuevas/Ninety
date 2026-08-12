/** Límite de reseña corta en Capsule (alineado con backend / DB ≤ 2000). */
export const CAPSULE_NOTE_MAX = 1000;

export function normalizeCapsuleNote(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > CAPSULE_NOTE_MAX ? trimmed.slice(0, CAPSULE_NOTE_MAX) : trimmed;
}

export function capsuleNoteLength(value: string | null | undefined): number {
  return (value ?? '').length;
}

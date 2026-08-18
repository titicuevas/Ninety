import { stripHtmlTags } from './postgrestSafe.js';

/** Límite de reseña corta en Capsule (columna `note`; DB permite hasta 2000). */
export const CAPSULE_NOTE_MAX = 1000;

export function normalizeCapsuleNote(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = stripHtmlTags(value).trim();
  if (!trimmed) return null;
  return trimmed.length > CAPSULE_NOTE_MAX ? trimmed.slice(0, CAPSULE_NOTE_MAX) : trimmed;
}

export function isCapsuleNoteTooLong(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value !== 'string') return false;
  return value.trim().length > CAPSULE_NOTE_MAX;
}

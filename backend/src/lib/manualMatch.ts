/** IDs de football-data.org son positivos; los manuales usan enteros negativos. */
export function isManualMatchId(id: number): boolean {
  return Number.isInteger(id) && id < 0;
}

/** Entero distinto de 0 (API football-data o partido manual). */
export function isValidCapsuleMatchId(id: number): boolean {
  return Number.isInteger(id) && id !== 0 && Number.isSafeInteger(id);
}

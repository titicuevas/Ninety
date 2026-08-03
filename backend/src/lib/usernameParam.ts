/** Normaliza `:username` de ruta para lookup case-insensitive (usernames se guardan en minúsculas). */
export function normalizeUsernameParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null || raw === '') return '';

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Parámetro mal codificado: usar el valor crudo.
  }

  return decoded.trim().toLowerCase();
}

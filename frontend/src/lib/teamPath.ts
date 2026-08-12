/** Slug estable para URLs `/teams/:slug`. */
export function slugifyTeamName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return base || 'equipo';
}

/** Ruta de descubrimiento por club favorito. */
export function teamPath(team: string): string {
  return `/teams/${encodeURIComponent(slugifyTeamName(team))}`;
}

/** Solo si hay texto de equipo usable. */
export function teamPathFromFavorite(team?: string | null): string | null {
  const trimmed = team?.trim();
  if (!trimmed) return null;
  return teamPath(trimmed);
}

import type { Profile } from '@/types/profile';

/** Etiqueta corta para badges de discover de perfiles. */
export function discoverProfileMatchLabel(
  reason: Profile['match_reason'],
): string | null {
  if (reason === 'favorite_team') return 'Mismo equipo';
  if (reason === 'city' || reason === 'country') return 'Cerca';
  if (reason === 'active') return 'Activo';
  return null;
}

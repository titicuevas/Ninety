import type { Profile } from '@/types/profile';

export type DiscoverReasonFilter = 'favorite_team' | 'nearby' | 'active';

export const DISCOVER_REASON_CHIPS: ReadonlyArray<{
  value: DiscoverReasonFilter | null;
  label: string;
}> = [
  { value: null, label: 'Todas' },
  { value: 'favorite_team', label: 'Mismo equipo' },
  { value: 'nearby', label: 'Cerca' },
  { value: 'active', label: 'Activos' },
];

export function parseDiscoverReasonParam(value: string | null): DiscoverReasonFilter | null {
  if (value === 'favorite_team' || value === 'nearby' || value === 'active') return value;
  return null;
}

/** Etiqueta corta para badges de discover de perfiles. */
export function discoverProfileMatchLabel(
  reason: Profile['match_reason'],
): string | null {
  if (reason === 'favorite_team') return 'Mismo equipo';
  if (reason === 'city' || reason === 'country') return 'Cerca';
  if (reason === 'active') return 'Activo';
  return null;
}

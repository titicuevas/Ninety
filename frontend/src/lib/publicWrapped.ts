import type { WrappedScope } from '@/lib/capsuleStats';
import type { PublicProfileStats } from '@/types/publicProfile';

export function pickPublicWrappedStats(
  lifetime: PublicProfileStats | undefined,
  byYear: Record<string, PublicProfileStats> | undefined,
  scope: WrappedScope,
): PublicProfileStats | undefined {
  if (scope === 'all' || byYear == null) return lifetime;
  return byYear[String(scope)] ?? lifetime;
}

export function publicWrappedPeriodLabel(scope: WrappedScope, totalMatches: number): string {
  const count = `${totalMatches} ${totalMatches === 1 ? 'partido' : 'partidos'}`;
  if (scope === 'all') return `Resumen de su diario visible · ${count}`;
  return `Su ${scope} · ${count}`;
}

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { LANDING_SHOWCASE_FALLBACK } from '@/lib/landingShowcaseFallback';
import type { Capsule } from '@/types/capsule';
import type { PublicProfileStats } from '@/types/publicProfile';

const SHOWCASE_USERNAME = 'beta_ninety';

export interface LandingShowcaseData {
  profile: { display_name: string | null; username: string };
  capsules: Capsule[];
  total: number;
  stats?: PublicProfileStats;
  fromFallback?: boolean;
}

/**
 * Portada: siempre hay vitrina (datos curados).
 * Si la API responde con Capsules reales, se sustituyen; si no, se quedan los de ejemplo.
 */
async function fetchShowcase(): Promise<LandingShowcaseData> {
  try {
    const live = await apiFetch<LandingShowcaseData>(
      `/api/capsules/user/${SHOWCASE_USERNAME}?limit=3&offset=0`,
    );
    if (live.capsules?.length) {
      return { ...live, fromFallback: false };
    }
  } catch {
    // PostgREST/API caídos: la portada no debe quedar vacía
  }
  return { ...LANDING_SHOWCASE_FALLBACK };
}

export function useLandingShowcase() {
  return useQuery({
    queryKey: ['landing', 'showcase'],
    queryFn: fetchShowcase,
    initialData: LANDING_SHOWCASE_FALLBACK,
    staleTime: 1000 * 60 * 10,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

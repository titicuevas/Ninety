import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Capsule } from '@/types/capsule';
import type { PublicProfileStats } from '@/types/publicProfile';

const SHOWCASE_USERNAME = 'beta_ninety';

interface ShowcaseResponse {
  profile: { display_name: string | null; username: string };
  capsules: Capsule[];
  total: number;
  stats?: PublicProfileStats;
}

async function fetchShowcase(): Promise<ShowcaseResponse> {
  return apiFetch<ShowcaseResponse>(`/api/capsules/user/${SHOWCASE_USERNAME}?limit=3&offset=0`);
}

export function useLandingShowcase() {
  return useQuery({
    queryKey: ['landing', 'showcase'],
    queryFn: fetchShowcase,
    staleTime: 1000 * 60 * 10, // 10 min — es datos de vitrina, no necesita refetch constante
    retry: 1,
  });
}

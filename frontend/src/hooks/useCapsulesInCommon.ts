import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export type CapsuleInCommonMatch = {
  match_id: number;
  home_team_name: string;
  away_team_name: string;
  competition_name: string | null;
  watched_at: string | null;
  photo_urls: string[] | null;
  me_capsule_id: string;
  me_rating: number | null;
  them_capsule_id: string;
  them_rating: number | null;
};

export type CapsulesInCommonResponse = {
  matches: CapsuleInCommonMatch[];
  total: number;
};

/** Partidos que ambos habéis guardado (`GET /api/capsules/user/:username/in-common`). */
export function useCapsulesInCommon(username?: string | null) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', 'in-common', username],
    queryFn: () =>
      apiFetch<CapsulesInCommonResponse>(
        `/api/capsules/user/${encodeURIComponent(username!)}/in-common`,
        {},
        session?.access_token,
      ),
    enabled: !!session && !!username,
  });
}

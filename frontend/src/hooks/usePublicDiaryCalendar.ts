import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Capsule } from '@/types/capsule';
import type { Profile } from '@/types/profile';
import type { DiaryCalendarDay } from '@/hooks/useDiaryCalendar';

export type PublicDiaryCalendarResponse = {
  profile: Profile;
  year: number;
  month: number;
  from: string;
  to: string;
  days: DiaryCalendarDay[];
  capsules: Capsule[];
  total: number;
};

export function usePublicDiaryCalendar(
  username: string | undefined,
  year: number,
  month: number,
) {
  const session = useAuthStore((s) => s.session);
  const handle = username?.trim().toLowerCase() ?? '';

  return useQuery({
    queryKey: ['capsules', 'user', handle, 'calendar', year, month, session?.access_token ?? 'guest'],
    queryFn: () =>
      apiFetch<PublicDiaryCalendarResponse>(
        `/api/capsules/user/${encodeURIComponent(handle)}/calendar?year=${year}&month=${month}`,
        {},
        session?.access_token,
      ),
    enabled:
      handle.length >= 3 &&
      year >= 1990 &&
      year <= 2100 &&
      month >= 1 &&
      month <= 12,
  });
}

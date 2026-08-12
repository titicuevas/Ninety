import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import type { Capsule } from '@/types/capsule';

export type DiaryCalendarDay = {
  date: string;
  count: number;
};

export type DiaryCalendarResponse = {
  year: number;
  month: number;
  from: string;
  to: string;
  days: DiaryCalendarDay[];
  capsules: Capsule[];
  total: number;
};

export function useDiaryCalendar(year: number, month: number) {
  const session = useAuthStore((s) => s.session);

  return useQuery({
    queryKey: ['capsules', 'me', 'calendar', year, month],
    queryFn: () =>
      apiFetch<DiaryCalendarResponse>(
        `/api/capsules/me/calendar?year=${year}&month=${month}`,
        {},
        session?.access_token,
      ),
    enabled: !!session && year >= 1990 && year <= 2100 && month >= 1 && month <= 12,
  });
}

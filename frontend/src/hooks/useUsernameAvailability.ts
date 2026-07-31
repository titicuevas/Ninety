import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { isAutoUsername } from '@/lib/profileHelpers';
import { useAuthStore } from '@/stores/authStore';

export type UsernameAvailability = {
  available: boolean;
  username?: string;
  own?: boolean;
  reason?: 'invalid';
};

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export function isUsernameFormatValid(username: string) {
  return USERNAME_RE.test(username.trim().toLowerCase());
}

export function useUsernameAvailability(
  username: string,
  currentUsername?: string | null,
) {
  const session = useAuthStore((s) => s.session);
  const normalized = username.trim().toLowerCase();
  const formatOk = isUsernameFormatValid(normalized);
  const isCurrent =
    !!currentUsername &&
    !isAutoUsername(currentUsername) &&
    currentUsername.toLowerCase() === normalized;

  return useQuery({
    queryKey: ['profile', 'username-available', normalized],
    queryFn: () =>
      apiFetch<UsernameAvailability>(
        `/api/profile/username-available?u=${encodeURIComponent(normalized)}`,
        {},
        session?.access_token,
      ),
    enabled: !!session?.access_token && formatOk && !isCurrent,
    staleTime: 30_000,
    retry: false,
    placeholderData: isCurrent ? { available: true, username: normalized, own: true } : undefined,
  });
}

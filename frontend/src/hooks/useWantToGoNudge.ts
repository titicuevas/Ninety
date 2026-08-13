import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuthInit';
import { useWantToGoList } from '@/hooks/useWantToGo';
import { findWantToGoNudge, type WantToGoNudge } from '@/lib/wantToGoNudge';
import {
  dismissWantToGoNudge,
  getSkippedWantToGoMatchIds,
  isWantToGoNudgeEnabled,
  readWantToGoNudgePrefs,
  shouldShowWantToGoNudge,
  skipWantToGoNudgeMatch,
} from '@/lib/wantToGoNudgeMemory';

type Options = {
  coreComplete: boolean;
  valueOnboardingVisible: boolean;
  anniversaryVisible?: boolean;
  milestoneVisible?: boolean;
  incompleteCapsuleVisible?: boolean;
};

export function useWantToGoNudge({
  coreComplete,
  valueOnboardingVisible,
  anniversaryVisible = false,
  milestoneVisible = false,
  incompleteCapsuleVisible = false,
}: Options) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [tick, setTick] = useState(0);
  const { data } = useWantToGoList();

  const prefs = useMemo(() => {
    void tick;
    return userId ? readWantToGoNudgePrefs(userId) : null;
  }, [userId, tick]);

  const nudge: WantToGoNudge | null = useMemo(
    () => findWantToGoNudge(data?.items ?? [], getSkippedWantToGoMatchIds(prefs)),
    [data?.items, prefs],
  );

  const visible = shouldShowWantToGoNudge(prefs, {
    coreComplete,
    valueOnboardingVisible,
    anniversaryVisible,
    milestoneVisible,
    incompleteCapsuleVisible,
    hasCandidate: nudge != null,
  });

  const dismiss = useCallback(
    (permanent = false) => {
      if (!userId) return;
      dismissWantToGoNudge(userId, {
        permanent,
        matchId: nudge?.matchId,
      });
      setTick((n) => n + 1);
    },
    [userId, nudge?.matchId],
  );

  const openList = useCallback(() => {
    if (!userId || !nudge) return;
    skipWantToGoNudgeMatch(userId, nudge.matchId);
    dismissWantToGoNudge(userId, { matchId: nudge.matchId });
    setTick((n) => n + 1);
  }, [userId, nudge]);

  return {
    nudge,
    visible,
    enabled: isWantToGoNudgeEnabled(prefs),
    dismiss,
    openList,
  };
}

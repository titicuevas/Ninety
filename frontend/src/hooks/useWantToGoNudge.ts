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
import type { Capsule } from '@/types/capsule';

type Options = {
  capsules: Capsule[];
  coreComplete: boolean;
  valueOnboardingVisible: boolean;
  anniversaryVisible?: boolean;
  milestoneVisible?: boolean;
  incompleteCapsuleVisible?: boolean;
};

export function useWantToGoNudge({
  capsules,
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

  const capsuleMatchIds = useMemo(() => {
    const ids: number[] = [];
    for (const capsule of capsules) {
      if (Number.isFinite(capsule.match_id)) ids.push(capsule.match_id);
    }
    return ids;
  }, [capsules]);

  const nudge: WantToGoNudge | null = useMemo(
    () =>
      findWantToGoNudge(
        data?.items ?? [],
        getSkippedWantToGoMatchIds(prefs),
        new Date(),
        capsuleMatchIds,
      ),
    [data?.items, prefs, capsuleMatchIds],
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

  const openPrimary = useCallback(() => {
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
    openPrimary,
    /** @deprecated usar openPrimary */
    openList: openPrimary,
  };
}

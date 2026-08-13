import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuthInit';
import {
  findIncompleteCapsule,
  type IncompleteCapsuleNudge,
} from '@/lib/incompleteCapsule';
import {
  dismissIncompleteCapsuleNudge,
  getSkippedIncompleteCapsuleIds,
  isIncompleteCapsuleNudgeEnabled,
  readIncompleteCapsulePrefs,
  shouldShowIncompleteCapsuleNudge,
  skipIncompleteCapsule,
} from '@/lib/incompleteCapsuleMemory';
import type { Capsule } from '@/types/capsule';

type Options = {
  capsules: Capsule[];
  coreComplete: boolean;
  valueOnboardingVisible: boolean;
  anniversaryVisible?: boolean;
  milestoneVisible?: boolean;
};

export function useIncompleteCapsuleNudge({
  capsules,
  coreComplete,
  valueOnboardingVisible,
  anniversaryVisible = false,
  milestoneVisible = false,
}: Options) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [tick, setTick] = useState(0);

  const prefs = useMemo(() => {
    void tick;
    return userId ? readIncompleteCapsulePrefs(userId) : null;
  }, [userId, tick]);

  const nudge: IncompleteCapsuleNudge | null = useMemo(
    () => findIncompleteCapsule(capsules, getSkippedIncompleteCapsuleIds(prefs)),
    [capsules, prefs],
  );

  const visible = shouldShowIncompleteCapsuleNudge(prefs, {
    coreComplete,
    valueOnboardingVisible,
    anniversaryVisible,
    milestoneVisible,
    hasCandidate: nudge != null,
  });

  const dismiss = useCallback(
    (permanent = false) => {
      if (!userId) return;
      dismissIncompleteCapsuleNudge(userId, {
        permanent,
        capsuleId: nudge?.capsuleId,
      });
      setTick((n) => n + 1);
    },
    [userId, nudge?.capsuleId],
  );

  const openEdit = useCallback(() => {
    if (!userId || !nudge) return;
    skipIncompleteCapsule(userId, nudge.capsuleId);
    dismissIncompleteCapsuleNudge(userId, { capsuleId: nudge.capsuleId });
    setTick((n) => n + 1);
  }, [userId, nudge]);

  return {
    nudge,
    visible,
    enabled: isIncompleteCapsuleNudgeEnabled(prefs),
    dismiss,
    openEdit,
  };
}

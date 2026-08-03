import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuthInit';
import {
  computeDiaryMilestone,
  thresholdsToCelebrate,
  type DiaryMilestone,
} from '@/lib/diaryMilestone';
import {
  celebrateDiaryMilestone,
  dismissDiaryMilestone,
  getCelebratedMilestones,
  isDiaryMilestoneEnabled,
  readDiaryMilestonePrefs,
  setDiaryMilestoneEnabled,
  shouldShowDiaryMilestone,
} from '@/lib/diaryMilestoneMemory';
import type { Capsule } from '@/types/capsule';

type Options = {
  capsules: Capsule[];
  coreComplete: boolean;
  valueOnboardingVisible: boolean;
  anniversaryVisible?: boolean;
};

export function useDiaryMilestone({
  capsules,
  coreComplete,
  valueOnboardingVisible,
  anniversaryVisible = false,
}: Options) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [tick, setTick] = useState(0);

  const prefs = useMemo(() => {
    void tick;
    return userId ? readDiaryMilestonePrefs(userId) : null;
  }, [userId, tick]);

  const milestone: DiaryMilestone | null = useMemo(
    () => computeDiaryMilestone(capsules, getCelebratedMilestones(prefs)),
    [capsules, prefs],
  );

  const visible = shouldShowDiaryMilestone(prefs, {
    coreComplete,
    valueOnboardingVisible,
    anniversaryVisible,
    hasMilestone: milestone != null,
  });

  const dismiss = useCallback(
    (permanent = false) => {
      if (!userId) return;
      dismissDiaryMilestone(userId, { permanent });
      setTick((n) => n + 1);
    },
    [userId],
  );

  const celebrate = useCallback(() => {
    if (!userId || !milestone) return;
    celebrateDiaryMilestone(userId, thresholdsToCelebrate(milestone.threshold));
    setTick((n) => n + 1);
  }, [userId, milestone]);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (!userId) return;
      setDiaryMilestoneEnabled(userId, enabled);
      setTick((n) => n + 1);
    },
    [userId],
  );

  return {
    milestone,
    visible,
    enabled: isDiaryMilestoneEnabled(prefs),
    dismiss,
    celebrate,
    setEnabled,
  };
}

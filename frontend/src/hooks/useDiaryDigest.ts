import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuthInit';
import { computeDiaryDigest, type DiaryDigest } from '@/lib/diaryDigest';
import {
  dismissDiaryDigest,
  isDiaryDigestEnabled,
  markWeeklyDigestShown,
  readDiaryDigestPrefs,
  setDiaryDigestEnabled,
  shouldShowDiaryDigest,
} from '@/lib/diaryDigestMemory';
import type { Capsule } from '@/types/capsule';

type Options = {
  capsules: Capsule[];
  coreComplete: boolean;
  valueOnboardingVisible: boolean;
  anniversaryVisible?: boolean;
  milestoneVisible?: boolean;
  incompleteCapsuleVisible?: boolean;
  wantToGoNudgeVisible?: boolean;
};

export function useDiaryDigest({
  capsules,
  coreComplete,
  valueOnboardingVisible,
  anniversaryVisible = false,
  milestoneVisible = false,
  incompleteCapsuleVisible = false,
  wantToGoNudgeVisible = false,
}: Options) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [tick, setTick] = useState(0);

  const prefs = useMemo(() => {
    void tick;
    return userId ? readDiaryDigestPrefs(userId) : null;
  }, [userId, tick]);

  const digest: DiaryDigest | null = useMemo(
    () => computeDiaryDigest(capsules),
    [capsules],
  );

  const visible = shouldShowDiaryDigest(prefs, {
    coreComplete,
    valueOnboardingVisible,
    anniversaryVisible,
    milestoneVisible,
    incompleteCapsuleVisible,
    wantToGoNudgeVisible,
    hasDigest: digest != null,
    kind: digest?.kind ?? null,
  });

  useEffect(() => {
    if (!visible || !userId || digest?.kind !== 'weekly') return;
    markWeeklyDigestShown(userId);
  }, [visible, userId, digest?.kind]);

  const dismiss = useCallback(
    (permanent = false) => {
      if (!userId) return;
      dismissDiaryDigest(userId, { permanent });
      setTick((n) => n + 1);
    },
    [userId],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (!userId) return;
      setDiaryDigestEnabled(userId, enabled);
      setTick((n) => n + 1);
    },
    [userId],
  );

  return {
    digest,
    visible,
    enabled: isDiaryDigestEnabled(prefs),
    dismiss,
    setEnabled,
  };
}

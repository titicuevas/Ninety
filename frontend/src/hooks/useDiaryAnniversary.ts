import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuthInit';
import { computeDiaryAnniversary, type DiaryAnniversary } from '@/lib/diaryAnniversary';
import {
  dismissDiaryAnniversary,
  isDiaryAnniversaryEnabled,
  markDiaryAnniversaryShown,
  readDiaryAnniversaryPrefs,
  setDiaryAnniversaryEnabled,
  shouldShowDiaryAnniversary,
} from '@/lib/diaryAnniversaryMemory';
import type { Capsule } from '@/types/capsule';

type Options = {
  capsules: Capsule[];
  coreComplete: boolean;
  valueOnboardingVisible: boolean;
};

export function useDiaryAnniversary({
  capsules,
  coreComplete,
  valueOnboardingVisible,
}: Options) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [tick, setTick] = useState(0);

  const prefs = useMemo(() => {
    void tick;
    return userId ? readDiaryAnniversaryPrefs(userId) : null;
  }, [userId, tick]);

  const anniversary: DiaryAnniversary | null = useMemo(
    () => computeDiaryAnniversary(capsules),
    [capsules],
  );

  const visible = shouldShowDiaryAnniversary(prefs, {
    coreComplete,
    valueOnboardingVisible,
    hasAnniversary: anniversary != null,
  });

  useEffect(() => {
    if (!visible || !userId) return;
    markDiaryAnniversaryShown(userId);
  }, [visible, userId]);

  const dismiss = useCallback(
    (permanent = false) => {
      if (!userId) return;
      dismissDiaryAnniversary(userId, { permanent });
      setTick((n) => n + 1);
    },
    [userId],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (!userId) return;
      setDiaryAnniversaryEnabled(userId, enabled);
      setTick((n) => n + 1);
    },
    [userId],
  );

  return {
    anniversary,
    visible,
    enabled: isDiaryAnniversaryEnabled(prefs),
    dismiss,
    setEnabled,
  };
}

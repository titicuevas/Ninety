import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuthInit';
import {
  dismissValueOnboarding,
  readValueOnboardingState,
  shouldShowValueOnboarding,
} from '@/lib/valueOnboardingMemory';

type Options = {
  coreComplete: boolean;
  hasCollection: boolean;
};

export function useValueOnboarding({ coreComplete, hasCollection }: Options) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [tick, setTick] = useState(0);

  const state = useMemo(() => {
    void tick;
    return userId ? readValueOnboardingState(userId) : null;
  }, [userId, tick]);

  const hasCompare = !!state?.compareVisitedAt;

  const visible = shouldShowValueOnboarding(state, {
    coreComplete,
    hasCollection,
    hasCompare,
  });

  const dismiss = useCallback(
    (permanent = false) => {
      if (!userId) return;
      dismissValueOnboarding(userId, { permanent });
      setTick((n) => n + 1);
    },
    [userId],
  );

  return {
    visible,
    hasCompare,
    dismiss,
  };
}

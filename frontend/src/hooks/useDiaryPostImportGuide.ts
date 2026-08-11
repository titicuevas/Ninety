import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuthInit';
import {
  dismissDiaryPostImport,
  readDiaryPostImportState,
  shouldShowDiaryPostImportGuide,
} from '@/lib/diaryPostImportMemory';

type Options = {
  coreComplete: boolean;
};

export function useDiaryPostImportGuide({ coreComplete }: Options) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [tick, setTick] = useState(0);

  const state = useMemo(() => {
    void tick;
    return userId ? readDiaryPostImportState(userId) : null;
  }, [userId, tick]);

  const visible = shouldShowDiaryPostImportGuide(state, { coreComplete });

  const dismiss = useCallback(
    (permanent = false) => {
      if (!userId) return;
      dismissDiaryPostImport(userId, { permanent });
      setTick((n) => n + 1);
    },
    [userId],
  );

  return {
    visible,
    importedCount: state?.importedCount ?? 0,
    dismiss,
  };
}

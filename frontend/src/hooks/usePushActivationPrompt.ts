import { useCallback, useMemo, useState } from 'react';
import {
  useEnablePush,
  usePushEnabled,
  usePushPublicKey,
  usePushSupport,
} from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuthInit';
import {
  dismissPushPrompt,
  markPushActivated,
  readPushPromptState,
  shouldShowPushPrompt,
  type PushPromptReason,
} from '@/lib/pushPromptMemory';
import { friendlyApiError } from '@/lib/friendlyErrors';

type Context = 'home' | 'post_create';

export function usePushActivationPrompt(context: Context = 'home') {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data: support } = usePushSupport();
  const { data: pushKey, isError: pushUnavailable } = usePushPublicKey();
  const { data: pushEnabled } = usePushEnabled();
  const enablePush = useEnablePush();
  const [tick, setTick] = useState(0);

  const state = useMemo(() => {
    void tick;
    return userId ? readPushPromptState(userId) : null;
  }, [userId, tick]);

  const visible = shouldShowPushPrompt(state, {
    supported: !!support?.supported,
    pushConfigured: !!pushKey?.enabled && !pushUnavailable,
    pushEnabled: !!pushEnabled,
    permission: support?.permission ?? 'unsupported',
    requireReason: context === 'post_create' ? 'first_public_capsule' : undefined,
  });

  const dismiss = useCallback(
    (permanent = false) => {
      if (!userId) return;
      dismissPushPrompt(userId, { permanent });
      setTick((n) => n + 1);
    },
    [userId],
  );

  const activate = useCallback(() => {
    if (!userId) return;
    enablePush.mutate(undefined, {
      onSuccess: () => {
        markPushActivated(userId);
        setTick((n) => n + 1);
      },
    });
  }, [enablePush, userId]);

  return {
    visible,
    reason: state?.eligibleReason as PushPromptReason | undefined,
    dismiss,
    activate,
    isActivating: enablePush.isPending,
    error: enablePush.isError
      ? enablePush.error instanceof Error
        ? friendlyApiError(enablePush.error.message)
        : 'No se pudieron activar las alertas'
      : null,
  };
}

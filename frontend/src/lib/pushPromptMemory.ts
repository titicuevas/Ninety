export type PushPromptReason = 'first_public_capsule' | 'first_follow';

export type PushPromptState = {
  eligibleReason?: PushPromptReason;
  eligibleAt?: string;
  dismissedAt?: string;
  dismissPermanent?: boolean;
  activatedAt?: string;
};

const STORAGE_PREFIX = 'ninety.pushPrompt:v1:';
/** Soft dismiss: no volver a mostrar durante 7 días. */
const PUSH_PROMPT_SOFT_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readPushPromptState(userId: string): PushPromptState | null {
  if (!userId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as PushPromptState;
  } catch {
    localStorage.removeItem(storageKey(userId));
    return null;
  }
}

function writePushPromptState(userId: string, state: PushPromptState): PushPromptState {
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
  return state;
}

/** Marca elegibilidad una sola vez (conserva el primer motivo). */
export function markPushPromptEligible(
  userId: string,
  reason: PushPromptReason,
): PushPromptState | null {
  if (!userId) return null;
  const prev = readPushPromptState(userId) ?? {};
  if (prev.activatedAt || prev.dismissPermanent) return prev;
  if (prev.eligibleReason) return prev;
  return writePushPromptState(userId, {
    ...prev,
    eligibleReason: reason,
    eligibleAt: new Date().toISOString(),
  });
}

export function dismissPushPrompt(
  userId: string,
  options?: { permanent?: boolean },
): PushPromptState | null {
  if (!userId) return null;
  const prev = readPushPromptState(userId) ?? {};
  return writePushPromptState(userId, {
    ...prev,
    dismissedAt: new Date().toISOString(),
    ...(options?.permanent ? { dismissPermanent: true } : {}),
  });
}

export function markPushActivated(userId: string): PushPromptState | null {
  if (!userId) return null;
  const prev = readPushPromptState(userId) ?? {};
  return writePushPromptState(userId, {
    ...prev,
    activatedAt: new Date().toISOString(),
  });
}

export function shouldShowPushPrompt(
  state: PushPromptState | null,
  opts: {
    supported: boolean;
    pushConfigured: boolean;
    pushEnabled: boolean;
    permission: NotificationPermission | 'unsupported';
    /** Solo post-crear: exige motivo first_public_capsule. */
    requireReason?: PushPromptReason;
  },
): boolean {
  if (!opts.supported || !opts.pushConfigured || opts.pushEnabled) return false;
  if (opts.permission === 'denied' || opts.permission === 'unsupported') return false;
  if (!state?.eligibleReason) return false;
  if (opts.requireReason && state.eligibleReason !== opts.requireReason) return false;
  if (state.activatedAt || state.dismissPermanent) return false;
  if (state.dismissedAt) {
    const dismissedAt = Date.parse(state.dismissedAt);
    if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < PUSH_PROMPT_SOFT_DISMISS_MS) {
      return false;
    }
  }
  return true;
}

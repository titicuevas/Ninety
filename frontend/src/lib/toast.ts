type ToastTone = 'success' | 'error';

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type Listener = (toasts: ToastItem[]) => void;

const toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, number>();
const DEFAULT_MS = 3500;
/** Tope de seguridad si llegan mensajes distintos a la vez. */
const MAX_VISIBLE = 3;

function emit() {
  const snapshot = [...toasts];
  for (const listener of listeners) listener(snapshot);
}

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (timer != null) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
}

function scheduleDismiss(id: string, ms = DEFAULT_MS) {
  clearTimer(id);
  timers.set(
    id,
    window.setTimeout(() => {
      timers.delete(id);
      dismissToast(id);
    }, ms),
  );
}

function pushToast(message: string, tone: ToastTone) {
  const trimmed = message.trim();
  if (!trimmed) return '';

  const existing = toasts.find((t) => t.tone === tone && t.message === trimmed);
  if (existing) {
    // Mismo aviso otra vez (p. ej. spam de “Responder”): reinicia el temporizador, no apila.
    scheduleDismiss(existing.id);
    emit();
    return existing.id;
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts.push({ id, message: trimmed, tone });

  while (toasts.length > MAX_VISIBLE) {
    const oldest = toasts[0];
    if (!oldest) break;
    clearTimer(oldest.id);
    toasts.shift();
  }

  emit();
  scheduleDismiss(id);
  return id;
}

export function dismissToast(id: string) {
  clearTimer(id);
  const index = toasts.findIndex((t) => t.id === id);
  if (index < 0) return;
  toasts.splice(index, 1);
  emit();
}

/** Solo tests: vacía la cola y los timers. */
export function __resetToastsForTests() {
  for (const id of [...timers.keys()]) clearTimer(id);
  toasts.length = 0;
  emit();
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener([...toasts]);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success(message: string) {
    return pushToast(message, 'success');
  },
  error(message: string) {
    return pushToast(message, 'error');
  },
};

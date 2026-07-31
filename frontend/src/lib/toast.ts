type ToastTone = 'success' | 'error';

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type Listener = (toasts: ToastItem[]) => void;

const toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
const DEFAULT_MS = 3500;

function emit() {
  const snapshot = [...toasts];
  for (const listener of listeners) listener(snapshot);
}

function pushToast(message: string, tone: ToastTone) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts.push({ id, message, tone });
  emit();
  window.setTimeout(() => dismissToast(id), DEFAULT_MS);
  return id;
}

export function dismissToast(id: string) {
  const index = toasts.findIndex((t) => t.id === id);
  if (index < 0) return;
  toasts.splice(index, 1);
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

import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';

type UseDirtyLeaveOptions = {
  isDirty: boolean;
  /** Mientras true no bloquea (p. ej. guardando). */
  isBusy?: boolean;
  /** Efectos al abandonar (limpiar borrador…). Siempre al confirmar o al salir limpio. */
  onAbandon?: () => void;
  /** Navegar cuando no hay blocker pendiente (botón Cancelar). */
  onLeave?: () => void;
};

/**
 * Bloquea navegación in-app y refresh/cerrar pestaña si el formulario está dirty.
 * Requiere data router (`createBrowserRouter`).
 */
export function useDirtyLeave({
  isDirty,
  isBusy = false,
  onAbandon,
  onLeave,
}: UseDirtyLeaveOptions) {
  const [manualOpen, setManualOpen] = useState(false);
  const skipBlockRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !skipBlockRef.current &&
      isDirty &&
      !isBusy &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash),
  );

  const leaveOpen = manualOpen || blocker.state === 'blocked';

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const allowNextNavigation = () => {
    skipBlockRef.current = true;
  };

  const requestLeave = () => {
    if (isDirty) {
      setManualOpen(true);
      return;
    }
    onAbandon?.();
    allowNextNavigation();
    onLeave?.();
  };

  const confirmLeave = () => {
    setManualOpen(false);
    onAbandon?.();
    if (blocker.state === 'blocked') {
      blocker.proceed();
      return;
    }
    allowNextNavigation();
    onLeave?.();
  };

  const dismissLeave = () => {
    setManualOpen(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  return {
    leaveOpen,
    requestLeave,
    confirmLeave,
    dismissLeave,
    allowNextNavigation,
  };
}

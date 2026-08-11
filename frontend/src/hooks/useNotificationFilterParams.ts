import { useSearchParams } from 'react-router-dom';
import {
  parseNotificationTypeParam,
  type NotificationListFilter,
} from '@/lib/notificationTypeFilter';

export type NotificationFilterParams = {
  type: NotificationListFilter;
  setType: (next: NotificationListFilter) => void;
  clearType: () => void;
};

/** Tipo de alerta en la URL (`?type=like|comment|follow`), compartible y back-friendly. */
export function useNotificationFilterParams(): NotificationFilterParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = parseNotificationTypeParam(searchParams.get('type'));

  const setType = (next: NotificationListFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('type', next);
    else params.delete('type');
    setSearchParams(params, { replace: true });
  };

  return {
    type,
    setType,
    clearType: () => setType(null),
  };
}

import { useSearchParams } from 'react-router-dom';
import {
  parseActivityTypeParam,
  type ActivityListFilter,
} from '@/lib/activityTypeFilter';

export type ActivityFilterParams = {
  type: ActivityListFilter;
  setType: (next: ActivityListFilter) => void;
  clearType: () => void;
};

/** Tipo de actividad en la URL (`?type=capsule|collection`). */
export function useActivityFilterParams(): ActivityFilterParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = parseActivityTypeParam(searchParams.get('type'));

  const setType = (next: ActivityListFilter) => {
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

import { useSearchParams } from 'react-router-dom';
import {
  parseFeedScope,
  parseFeedSort,
  type FeedScope,
  type FeedSort,
} from '@/lib/feedParams';

export type FeedFilterParams = {
  scope: FeedScope;
  sort: FeedSort;
  setScope: (next: FeedScope) => void;
  setSort: (next: FeedSort) => void;
};

/** Scope/sort del feed en la URL (compartible, back-button friendly). */
export function useFeedFilterParams(): FeedFilterParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = parseFeedScope(searchParams.get('scope'));
  const sort = parseFeedSort(searchParams.get('sort'));

  const patch = (nextScope: FeedScope, nextSort: FeedSort) => {
    const next = new URLSearchParams(searchParams);
    if (nextScope === 'following') next.delete('scope');
    else next.set('scope', nextScope);
    if (nextSort === 'recent') next.delete('sort');
    else next.set('sort', nextSort);
    setSearchParams(next, { replace: true });
  };

  return {
    scope,
    sort,
    setScope: (next) => patch(next, sort),
    setSort: (next) => patch(scope, next),
  };
}

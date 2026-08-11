import { useSearchParams } from 'react-router-dom';
import {
  parseFeedCompetition,
  parseFeedPhotos,
  parseFeedScope,
  parseFeedSort,
  type FeedContentFilters,
  type FeedScope,
  type FeedSort,
} from '@/lib/feedParams';

export type FeedFilterParams = {
  scope: FeedScope;
  sort: FeedSort;
  photosOnly: boolean;
  competition: string;
  content: FeedContentFilters;
  setScope: (next: FeedScope) => void;
  setSort: (next: FeedSort) => void;
  setPhotosOnly: (next: boolean) => void;
  setCompetition: (next: string) => void;
  clearContentFilters: () => void;
};

/** Scope/sort/contenido del feed en la URL (compartible, back-button friendly). */
export function useFeedFilterParams(): FeedFilterParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = parseFeedScope(searchParams.get('scope'));
  const sort = parseFeedSort(searchParams.get('sort'));
  const photosOnly = parseFeedPhotos(searchParams.get('photos'));
  const competition = parseFeedCompetition(searchParams.get('competition'));
  const content: FeedContentFilters = { photosOnly, competition };

  const patch = (next: {
    scope: FeedScope;
    sort: FeedSort;
    photosOnly: boolean;
    competition: string;
  }) => {
    const params = new URLSearchParams(searchParams);
    if (next.scope === 'following') params.delete('scope');
    else params.set('scope', next.scope);
    if (next.sort === 'recent') params.delete('sort');
    else params.set('sort', next.sort);
    if (next.photosOnly) params.set('photos', '1');
    else params.delete('photos');
    if (next.competition.length >= 2) params.set('competition', next.competition);
    else params.delete('competition');
    setSearchParams(params, { replace: true });
  };

  return {
    scope,
    sort,
    photosOnly,
    competition,
    content,
    setScope: (next) => patch({ scope: next, sort, photosOnly, competition }),
    setSort: (next) => patch({ scope, sort: next, photosOnly, competition }),
    setPhotosOnly: (next) => patch({ scope, sort, photosOnly: next, competition }),
    setCompetition: (next) =>
      patch({
        scope,
        sort,
        photosOnly,
        competition: parseFeedCompetition(next || null),
      }),
    clearContentFilters: () => patch({ scope, sort, photosOnly: false, competition: '' }),
  };
}

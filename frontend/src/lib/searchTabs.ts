export type SearchTab = 'matches' | 'people' | 'lists';

export const SEARCH_TABS: ReadonlyArray<{ id: SearchTab; label: string }> = [
  { id: 'matches', label: 'Partidos' },
  { id: 'people', label: 'Aficionados' },
  { id: 'lists', label: 'Listas' },
];

export function parseSearchTab(value: string | null): SearchTab {
  if (value === 'people' || value === 'lists') return value;
  return 'matches';
}

export function searchTabDocumentTitle(tab: SearchTab): string {
  if (tab === 'people') return 'Buscar aficionados';
  if (tab === 'lists') return 'Buscar listas';
  return 'Buscar partido';
}

/** Ajusta `tab` y quita params que no aplican a esa pestaña. */
export function applySearchTab(params: URLSearchParams, next: SearchTab): URLSearchParams {
  const nextParams = new URLSearchParams(params);
  if (next === 'matches') nextParams.delete('tab');
  else nextParams.set('tab', next);
  if (next !== 'people') nextParams.delete('reason');
  if (next !== 'lists') nextParams.delete('sort');
  return nextParams;
}

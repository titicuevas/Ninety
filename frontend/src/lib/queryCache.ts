import type { InfiniteData } from '@tanstack/react-query';

/** True si el valor es un InfiniteData de React Query (tiene `pages`). */
export function isInfiniteQueryData<TPage>(
  old: unknown,
): old is InfiniteData<TPage> {
  return (
    typeof old === 'object' &&
    old !== null &&
    Array.isArray((old as InfiniteData<TPage>).pages)
  );
}

/** True si el valor es `{ profiles: T[] }`. */
export function isProfilesList<T>(old: unknown): old is { profiles: T[] } {
  return (
    typeof old === 'object' &&
    old !== null &&
    Array.isArray((old as { profiles?: unknown }).profiles)
  );
}

/** True si el valor es `{ comments: T[] }`. */
export function isCommentsList<T>(old: unknown): old is { comments: T[] } {
  return (
    typeof old === 'object' &&
    old !== null &&
    Array.isArray((old as { comments?: unknown }).comments)
  );
}

/** Aplica un mapper a cada página solo si `old` es InfiniteData. */
export function mapInfinitePages<TPage>(
  old: unknown,
  mapPage: (page: TPage, index: number) => TPage,
): unknown {
  if (!isInfiniteQueryData<TPage>(old)) return old;
  return {
    ...old,
    pages: old.pages.map(mapPage),
  };
}

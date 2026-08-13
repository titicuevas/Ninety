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

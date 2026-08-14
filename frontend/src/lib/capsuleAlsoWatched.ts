export type AlsoWatchedPerson = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  capsule_id: string;
};

/** No repetir al autor de la Capsule que ya estás viendo. */
export function filterAlsoWatchedPeople<T extends { id: string }>(
  people: T[],
  exceptUserId?: string | null,
): T[] {
  if (!exceptUserId) return people;
  return people.filter((person) => person.id !== exceptUserId);
}

export function alsoWatchedLabel(count: number): string {
  return count === 1 ? 'También lo vio' : 'También lo vieron';
}

export type CollectionAlsoLikedPerson = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

/** No repetir al dueño de la lista que ya estás viendo. */
export function filterAlsoLikedPeople<T extends { id: string }>(
  people: T[],
  exceptUserId?: string | null,
): T[] {
  if (!exceptUserId) return people;
  return people.filter((person) => person.id !== exceptUserId);
}

export function alsoLikedLabel(count: number): string {
  return count === 1 ? 'También le gusta' : 'También les gusta';
}

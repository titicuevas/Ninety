/** Slug estable para colecciones (URL pública `/u/:username/lists/:slug`). */
export function slugifyCollectionName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return base || 'coleccion';
}

/** Asegura unicidad añadiendo `-2`, `-3`… si hace falta. */
export function nextUniqueSlug(desired: string, taken: Set<string>): string {
  const root = slugifyCollectionName(desired);
  if (!taken.has(root)) return root;

  for (let n = 2; n < 1000; n += 1) {
    const suffix = `-${n}`;
    const truncated = root.slice(0, Math.max(1, 80 - suffix.length));
    const candidate = `${truncated}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${root.slice(0, 70)}-${Date.now().toString(36)}`;
}

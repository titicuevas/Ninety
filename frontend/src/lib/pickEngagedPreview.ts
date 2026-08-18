export type EngagedPreviewItem = {
  id: string;
  likes_count?: number;
  comments_count?: number;
  also_watched?: unknown[] | null;
  also_liked?: unknown[] | null;
  also_commented?: unknown[] | null;
};

function hasCounts(item: EngagedPreviewItem): boolean {
  return (item.likes_count ?? 0) > 0 || (item.comments_count ?? 0) > 0;
}

function hasAlsoFollowed(item: EngagedPreviewItem): boolean {
  return (
    (item.also_watched?.length ?? 0) > 0 ||
    (item.also_liked?.length ?? 0) > 0 ||
    (item.also_commented?.length ?? 0) > 0
  );
}

/** Prioriza likes/comentarios y pie social de follows, sin duplicar. */
export function pickEngagedPreview<T extends EngagedPreviewItem>(items: T[], limit: number): T[] {
  if (limit <= 0) return [];
  const withCounts = items.filter(hasCounts);
  const withAlso = items.filter((item) => hasAlsoFollowed(item) && !hasCounts(item));
  const mixed: T[] = [];
  const seen = new Set<string>();
  let countsIdx = 0;
  let alsoIdx = 0;
  while (mixed.length < limit && (countsIdx < withCounts.length || alsoIdx < withAlso.length)) {
    const next =
      mixed.length % 2 === 0
        ? (withCounts[countsIdx++] ?? withAlso[alsoIdx++])
        : (withAlso[alsoIdx++] ?? withCounts[countsIdx++]);
    if (!next || seen.has(next.id)) continue;
    seen.add(next.id);
    mixed.push(next);
  }
  if (mixed.length >= limit) return mixed;
  for (const item of items) {
    if (seen.has(item.id)) continue;
    mixed.push(item);
    seen.add(item.id);
    if (mixed.length >= limit) break;
  }
  return mixed;
}

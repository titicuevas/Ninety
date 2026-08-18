export type EngagedPreviewItem = {
  id: string;
  likes_count?: number;
  comments_count?: number;
  also_watched?: unknown[] | null;
};

function isEngaged(item: EngagedPreviewItem): boolean {
  return (
    (item.likes_count ?? 0) > 0 ||
    (item.comments_count ?? 0) > 0 ||
    (item.also_watched?.length ?? 0) > 0
  );
}

/** Prioriza ítems con likes, comentarios o «también lo vieron», sin duplicar. */
export function pickEngagedPreview<T extends EngagedPreviewItem>(items: T[], limit: number): T[] {
  if (limit <= 0) return [];
  const engaged = items.filter(isEngaged);
  if (engaged.length >= limit) return engaged.slice(0, limit);
  const seen = new Set(engaged.map((item) => item.id));
  const rest = items.filter((item) => !seen.has(item.id));
  return [...engaged, ...rest].slice(0, limit);
}

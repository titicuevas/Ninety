export type EngagedPreviewItem = {
  id: string;
  likes_count?: number;
  comments_count?: number;
};

function isEngaged(item: EngagedPreviewItem): boolean {
  return (item.likes_count ?? 0) > 0 || (item.comments_count ?? 0) > 0;
}

/** Prioriza ítems con likes/comentarios y rellena con el resto, sin duplicar. */
export function pickEngagedPreview<T extends EngagedPreviewItem>(items: T[], limit: number): T[] {
  if (limit <= 0) return [];
  const engaged = items.filter(isEngaged);
  if (engaged.length >= limit) return engaged.slice(0, limit);
  const seen = new Set(engaged.map((item) => item.id));
  const rest = items.filter((item) => !seen.has(item.id));
  return [...engaged, ...rest].slice(0, limit);
}

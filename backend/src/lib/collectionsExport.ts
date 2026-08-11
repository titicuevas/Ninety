/** Colección portable para backup GDPR (ítems por match_id, sin UUIDs internos). */
export type ExportCollectionItem = {
  match_id: number;
  position: number;
};

export type ExportCollection = {
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  cover_match_id: number | null;
  items: ExportCollectionItem[];
};

export type CollectionsExportPayload = {
  exported_at: string;
  format_version: 1;
  kind: 'collections';
  profile: {
    username: string | null;
    display_name: string | null;
  };
  collections: ExportCollection[];
};

export function buildCollectionsExportJson(payload: CollectionsExportPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/** Normaliza una fila de colección + ítems ya resueltos por match_id. */
export function toExportCollection(input: {
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  cover_match_id: number | null;
  items: Array<{ match_id: number; position: number }>;
}): ExportCollection {
  const items = [...input.items]
    .filter((item) => Number.isFinite(item.match_id) && item.match_id > 0)
    .sort((a, b) => a.position - b.position || a.match_id - b.match_id)
    .map((item, index) => ({
      match_id: item.match_id,
      position: index,
    }));

  const cover =
    input.cover_match_id != null && items.some((item) => item.match_id === input.cover_match_id)
      ? input.cover_match_id
      : null;

  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    is_public: input.is_public !== false,
    cover_match_id: cover,
    items,
  };
}

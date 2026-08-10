export interface Collection {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  cover_capsule_id?: string | null;
  cover_url?: string | null;
  created_at: string;
  updated_at: string;
  items_count?: number;
}

export interface CollectionAuthor {
  id?: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CollectionsListResponse {
  collections: Collection[];
}

export interface PublicCollectionsResponse {
  profile: CollectionAuthor;
  collections: Collection[];
}

export interface CollectionDetailResponse {
  profile: CollectionAuthor | null;
  collection: Collection;
  capsules: import('@/types/capsule').Capsule[];
}

export interface CreateCollectionInput {
  name: string;
  description?: string | null;
  is_public?: boolean;
  slug?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string | null;
  is_public?: boolean;
  slug?: string;
  cover_capsule_id?: string | null;
}

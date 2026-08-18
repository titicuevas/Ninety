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
  likes_count?: number;
  liked_by_me?: boolean;
  comments_count?: number;
  also_liked?: import('@/lib/collectionAlsoLiked').CollectionAlsoLikedPerson[];
  also_commented?: import('@/lib/collectionAlsoLiked').CollectionAlsoLikedPerson[];
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

export type DiscoverCollectionMatchReason = 'following' | 'favorite_team' | 'active' | null;

export interface DiscoverCollectionAuthor extends CollectionAuthor {
  id: string;
  followed_by_me?: boolean;
  follows_me?: boolean;
}

export interface DiscoverCollection extends Collection {
  author: DiscoverCollectionAuthor;
  match_reason: DiscoverCollectionMatchReason;
}

export interface DiscoverCollectionsResponse {
  collections: DiscoverCollection[];
  q?: string | null;
  sort?: 'relevant' | 'recent' | 'likes';
}

export interface LikedCollection extends Collection {
  liked_at: string;
  author: CollectionAuthor | null;
}

export interface LikedCollectionsResponse {
  collections: LikedCollection[];
  total: number;
  limit: number;
  offset: number;
}

export interface CollectionDetailResponse {
  profile: CollectionAuthor | null;
  collection: Collection;
  capsules: Array<
    import('@/types/capsule').Capsule & {
      likes_count?: number;
      liked_by_me?: boolean;
      comments_count?: number;
    }
  >;
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

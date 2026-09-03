import { z } from 'zod';

export const MAX_COLLECTIONS_PER_USER = 50;
export const MAX_ITEMS_PER_COLLECTION = 100;

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  is_public: z.boolean().optional().default(true),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  is_public: z.boolean().optional(),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
  cover_capsule_id: z.string().uuid().nullable().optional(),
});

export const addCollectionItemSchema = z.object({ capsule_id: z.string().uuid() });

export const reorderCollectionItemsSchema = z.object({
  capsule_ids: z.array(z.string().uuid()).min(1).max(MAX_ITEMS_PER_COLLECTION),
});

export const collectionCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(500),
  parent_id: z.string().uuid().optional().nullable(),
});

export type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  cover_capsule_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type CapsuleLite = {
  id: string;
  user_id: string;
  match_id?: number;
  home_team_name: string;
  away_team_name: string;
  home_team_crest: string | null;
  away_team_crest: string | null;
  competition_name: string | null;
  home_score: number | null;
  away_score: number | null;
  watched_at: string;
  rating: number | null;
  note: string | null;
  photo_urls: string[];
  is_public?: boolean;
  watch_context?: string | null;
  likes_count?: number;
  liked_by_me?: boolean;
  comments_count?: number;
};

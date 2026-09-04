import { z } from 'zod';
import { CAPSULE_NOTE_MAX } from '../lib/capsuleNote.js';
import { CAPSULE_TAG_MAX_LEN, CAPSULE_TAGS_MAX } from '../lib/capsuleTags.js';

const paginationFields = {
  limit: z.coerce.number().int().min(1).max(50),
  offset: z.coerce.number().int().min(0),
};

const capsuleMemoryFields = {
  watched_at: z.string().date(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  note: z.string().max(CAPSULE_NOTE_MAX).optional().nullable(),
  tags: z.array(z.string().max(CAPSULE_TAG_MAX_LEN)).max(CAPSULE_TAGS_MAX).optional(),
  photo_urls: z.array(z.string().url().max(2048)).max(9).optional(),
  is_public: z.boolean().optional(),
  watch_context: z.enum(['stadium', 'tv', 'pub', 'other']).optional().nullable(),
};

export const createCapsuleSchema = z.object({
  match_id: z.number().int().refine((value) => value !== 0, 'match_id no puede ser 0'),
  match_played_at: z.string().datetime().optional().nullable(),
  home_team_name: z.string().min(1).max(200),
  away_team_name: z.string().min(1).max(200),
  home_team_crest: z.string().url().optional().nullable(),
  away_team_crest: z.string().url().optional().nullable(),
  competition_name: z.string().max(200).optional().nullable(),
  home_score: z.number().int().min(0).max(99).optional().nullable(),
  away_score: z.number().int().min(0).max(99).optional().nullable(),
  ...capsuleMemoryFields,
  is_public: z.boolean().optional().default(true),
});

export const updateCapsuleSchema = z.object({
  ...capsuleMemoryFields,
  watched_at: capsuleMemoryFields.watched_at.optional(),
});

export const capsuleFeedQuerySchema = z.object({
  limit: paginationFields.limit.default(20),
  offset: paginationFields.offset.default(0),
  scope: z.enum(['following', 'explore']).default('following'),
  sort: z.enum(['recent', 'popular']).default('recent'),
  photos: z.string().optional(),
  competition: z.string().max(100).optional(),
});

const diaryFilterFields = {
  limit: paginationFields.limit.optional(),
  offset: paginationFields.offset.default(0),
  q: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  rating_min: z.coerce.number().int().min(1).max(5).optional(),
  watch_context: z.enum(['stadium', 'tv', 'pub', 'other']).optional(),
  tag: z.string().trim().max(CAPSULE_TAG_MAX_LEN).optional(),
};

export const ownCapsulesQuerySchema = z.object({
  ...diaryFilterFields,
  visibility: z.enum(['all', 'public', 'private']).optional().default('all'),
  sort: z.enum(['recent', 'oldest', 'top-rated']).optional().default('recent'),
});

export const publicCapsulesQuerySchema = z.object(diaryFilterFields);

export const capsuleCalendarQuerySchema = z.object({
  year: z.coerce.number().int().min(1990).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const capsulePageQuerySchema = z.object({
  limit: paginationFields.limit.optional().default(20),
  offset: paginationFields.offset.optional().default(0),
});

export const capsuleExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

export const capsulePhotoDeleteSchema = z.object({ url: z.string().url() });

export const capsuleCommentBodySchema = z.object({
  body: z.string().trim().min(1, 'Escribe un comentario').max(500),
  parent_id: z.string().uuid().optional().nullable(),
});

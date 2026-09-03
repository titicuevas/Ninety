import { z } from 'zod';

const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guiones bajos');

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  username: usernameSchema.optional(),
  avatar_url: z.string().url().optional().nullable(),
  favorite_team: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  bio: z.string().max(280).optional().nullable(),
  featured_collection_id: z.string().uuid().nullable().optional(),
});

export const profileFollowListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export const profilesByTeamQuerySchema = z.object({
  slug: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(50).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

export const usernameAvailableQuerySchema = z.object({
  u: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guiones bajos'),
});

export const profileSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(40),
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

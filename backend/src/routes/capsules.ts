import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { deleteCapsulePhotoByUrl, uploadCapsulePhotoBuffer } from '../lib/ensureStorage.js';
import { attachCommentCounts, fetchCommentsWithAuthors, isMissingCommentsTable } from '../lib/capsuleComments.js';
import { attachLikeStats, isMissingLikesTable } from '../lib/capsuleLikes.js';
import { normalizeProfile } from '../lib/profileNormalize.js';
import { createUserClient, supabaseAnon } from '../lib/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const capsulesRouter = Router();

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo JPG, PNG o WebP.'));
  },
});

const createCapsuleSchema = z.object({
  match_id: z.number().int().positive(),
  match_played_at: z.string().datetime().optional().nullable(),
  home_team_name: z.string().min(1).max(200),
  away_team_name: z.string().min(1).max(200),
  home_team_crest: z.string().url().optional().nullable(),
  away_team_crest: z.string().url().optional().nullable(),
  competition_name: z.string().max(200).optional().nullable(),
  home_score: z.number().int().min(0).max(99).optional().nullable(),
  away_score: z.number().int().min(0).max(99).optional().nullable(),
  watched_at: z.string().date(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  photo_urls: z.array(z.string().url().max(2048)).max(6).optional(),
});

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function getAccessToken(req: AuthRequest): string | null {
  return req.headers.authorization?.replace('Bearer ', '') ?? null;
}

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

capsulesRouter.get('/feed', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = feedQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { limit, offset } = parsed.data;
  const supabase = createUserClient(token);
  const { data: capsules, error, count } = await supabase
    .from('capsules')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const rows = capsules ?? [];
  const userIds = [...new Set(rows.map((c) => c.user_id))];
  const profileMap = new Map<string, { username: string | null; display_name: string | null; avatar_url: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      res.status(400).json({ error: profilesError.message });
      return;
    }

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        username: profile.username,
        display_name: profile.full_name ?? null,
        avatar_url: profile.avatar_url,
      });
    }
  }

  const withLikes = await attachLikeStats(supabase, req.userId!, rows);
  const feedRows = await attachCommentCounts(supabase, withLikes);

  res.json({
    capsules: feedRows.map((capsule) => ({
      ...capsule,
      profiles: profileMap.get(capsule.user_id) ?? null,
    })),
    total: count ?? 0,
  });
});

capsulesRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('user_id', req.userId!)
    .order('watched_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ capsules: data ?? [] });
});

capsulesRouter.get('/user/:username', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url, favorite_team, country, city, created_at')
    .eq('username', req.params.username)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('user_id', profile.id)
    .order('watched_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const withLikes = await attachLikeStats(supabase, req.userId!, data ?? []);
  const capsulesWithLikes = await attachCommentCounts(supabase, withLikes);

  res.json({ profile: normalizeProfile(profile), capsules: capsulesWithLikes });
});

capsulesRouter.post('/photos', requireAuth, photoUpload.array('photos', 6), async (req: AuthRequest, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) {
    res.status(400).json({ error: 'No se recibió ninguna foto.' });
    return;
  }

  try {
    const urls = await Promise.all(
      files.map((file) => uploadCapsulePhotoBuffer(req.userId!, file.buffer, file.mimetype)),
    );
    res.status(201).json({ urls });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'No se pudieron subir las fotos',
    });
  }
});

capsulesRouter.delete('/photos', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ url: z.string().url() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'URL inválida' });
    return;
  }

  if (!parsed.data.url.includes(`/${req.userId}/`)) {
    res.status(403).json({ error: 'No puedes borrar esta foto' });
    return;
  }

  try {
    await deleteCapsulePhotoByUrl(parsed.data.url);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'No se pudo borrar la foto',
    });
  }
});

const updateCapsuleSchema = z.object({
  watched_at: z.string().date().optional(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  photo_urls: z.array(z.string().url().max(2048)).max(6).optional(),
});

capsulesRouter.post('/:id/like', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { data: capsule, error: capsuleError } = await supabase
    .from('capsules')
    .select('id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (capsuleError) {
    res.status(400).json({ error: capsuleError.message });
    return;
  }

  if (!capsule) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  const { error } = await supabase.from('capsule_likes').insert({
    user_id: req.userId!,
    capsule_id: capsule.id,
  });

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ya diste like a esta Capsule' });
      return;
    }
    if (isMissingLikesTable(error)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250711200000_capsule_likes.sql en Supabase.',
      });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json({ liked: true });
});

capsulesRouter.delete('/:id/like', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { error, count } = await supabase
    .from('capsule_likes')
    .delete({ count: 'exact' })
    .eq('capsule_id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) {
    if (isMissingLikesTable(error)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250711200000_capsule_likes.sql en Supabase.',
      });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (!count) {
    res.status(404).json({ error: 'No había like en esta Capsule' });
    return;
  }

  res.status(204).end();
});

const commentBodySchema = z.object({
  body: z.string().trim().min(1, 'Escribe un comentario').max(500),
});

capsulesRouter.get('/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { data: capsule, error: capsuleError } = await supabase
    .from('capsules')
    .select('id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (capsuleError) {
    res.status(400).json({ error: capsuleError.message });
    return;
  }

  if (!capsule) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  try {
    const comments = await fetchCommentsWithAuthors(supabase, routeParam(req.params.id));
    res.json({ comments });
  } catch (err) {
    if (isMissingCommentsTable(err)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250711210000_capsule_comments.sql en Supabase.',
      });
      return;
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error al cargar comentarios' });
  }
});

capsulesRouter.post('/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = commentBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const supabase = createUserClient(token);
  const { data: capsule, error: capsuleError } = await supabase
    .from('capsules')
    .select('id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (capsuleError) {
    res.status(400).json({ error: capsuleError.message });
    return;
  }

  if (!capsule) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  const { data, error } = await supabase
    .from('capsule_comments')
    .insert({
      capsule_id: capsule.id,
      user_id: req.userId!,
      body: parsed.data.body,
    })
    .select('id, capsule_id, user_id, body, created_at')
    .single();

  if (error) {
    if (isMissingCommentsTable(error)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250711210000_capsule_comments.sql en Supabase.',
      });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('id', req.userId!)
    .maybeSingle();

  res.status(201).json({
    ...data,
    author: profile
      ? {
          username: profile.username,
          display_name: profile.full_name ?? null,
          avatar_url: profile.avatar_url,
        }
      : null,
  });
});

capsulesRouter.delete('/:id/comments/:commentId', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { error, count } = await supabase
    .from('capsule_comments')
    .delete({ count: 'exact' })
    .eq('id', req.params.commentId)
    .eq('capsule_id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) {
    if (isMissingCommentsTable(error)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250711210000_capsule_comments.sql en Supabase.',
      });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (!count) {
    res.status(404).json({ error: 'Comentario no encontrado' });
    return;
  }

  res.status(204).end();
});

capsulesRouter.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  res.json(data);
});

capsulesRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = createCapsuleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('capsules')
    .insert({
      user_id: req.userId!,
      ...parsed.data,
      photo_urls: parsed.data.photo_urls ?? [],
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ya guardaste este partido en tu diario' });
      return;
    }
    if (error.message.includes('schema cache') || error.message.includes('Could not find')) {
      res.status(503).json({
        error:
          'La base de datos necesita actualizarse. Ejecuta npm run verify:capsules --prefix backend o la migración 20250705170000 en Supabase.',
      });
      return;
    }
    if (error.message.includes('invalid input syntax for type uuid')) {
      res.status(503).json({
        error:
          'La columna match_id en Supabase tiene tipo incorrecto. Ejecuta la migración 20250705190000_capsules_match_id_integer.sql en el SQL Editor.',
      });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

capsulesRouter.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = updateCapsuleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('capsules')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.userId!)
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  res.json(data);
});

capsulesRouter.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { error, count } = await supabase
    .from('capsules')
    .delete({ count: 'exact' })
    .eq('id', req.params.id)
    .eq('user_id', req.userId!);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (!count) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  res.status(204).end();
});

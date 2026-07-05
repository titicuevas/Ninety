import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { deleteCapsulePhotoByUrl, uploadCapsulePhotoBuffer } from '../lib/ensureStorage.js';
import { createUserClient } from '../lib/supabase.js';
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

  res.json({
    capsules: rows.map((capsule) => ({
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

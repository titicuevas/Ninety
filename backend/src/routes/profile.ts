import { Router } from 'express';
import { z } from 'zod';
import { normalizeProfile, profileUpdatePayload } from '../lib/profileNormalize.js';
import { syncUserProfile } from '../lib/syncUserProfile.js';
import { createUserClient, supabaseAnon } from '../lib/supabase.js';
import { isMissingFollowsTable } from '../lib/userFollows.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const profileRouter = Router();

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guiones bajos')
    .optional(),
  avatar_url: z.string().url().optional().nullable(),
  favorite_team: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
});

function getAccessToken(req: AuthRequest): string | null {
  return req.headers.authorization?.replace('Bearer ', '') ?? null;
}

async function resolveProfileByUsername(username: string) {
  const { data, error } = await supabaseAnon
    .from('profiles')
    .select('id, username')
    .eq('username', username)
    .single();

  if (error || !data) return null;
  return data;
}

profileRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { data: authData } = await supabaseAnon.auth.getUser(token);

  if (authData.user) {
    await syncUserProfile({
      id: authData.user.id,
      email: authData.user.email,
      user_metadata: authData.user.user_metadata as Record<string, unknown>,
    });
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.userId!).single();

  if (error) {
    res.status(404).json({ error: 'Perfil no encontrado' });
    return;
  }

  res.json(normalizeProfile(data));
});

profileRouter.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = updateProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdatePayload(parsed.data))
    .eq('id', req.userId!)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ese username ya está en uso' });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  res.json(normalizeProfile(data));
});

profileRouter.post('/:username/follow', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const username = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
  const target = await resolveProfileByUsername(username);
  if (!target) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  if (target.id === req.userId) {
    res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
    return;
  }

  const supabase = createUserClient(token);
  const { error } = await supabase.from('user_follows').insert({
    follower_id: req.userId!,
    following_id: target.id,
  });

  if (error) {
    if (isMissingFollowsTable(error)) {
      res.status(503).json({ error: 'Función de seguir no disponible. Ejecuta la migración user_follows.' });
      return;
    }
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ya sigues a este usuario' });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json({ followed: true });
});

profileRouter.delete('/:username/follow', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const username = Array.isArray(req.params.username) ? req.params.username[0] : req.params.username;
  const target = await resolveProfileByUsername(username);
  if (!target) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', req.userId!)
    .eq('following_id', target.id)
    .select('follower_id');

  if (error) {
    if (isMissingFollowsTable(error)) {
      res.status(503).json({ error: 'Función de seguir no disponible. Ejecuta la migración user_follows.' });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (!data?.length) {
    res.status(404).json({ error: 'No seguías a este usuario' });
    return;
  }

  res.json({ followed: false });
});

profileRouter.get('/:username', async (req, res) => {
  const { data, error } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url, favorite_team, country, city, created_at')
    .eq('username', req.params.username)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  res.json(normalizeProfile(data));
});

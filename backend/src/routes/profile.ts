import { Router } from 'express';
import { z } from 'zod';
import { createUserClient, supabaseAnon } from '../lib/supabase.js';
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
  bio: z.string().max(500).optional().nullable(),
});

function getAccessToken(req: AuthRequest): string | null {
  return req.headers.authorization?.replace('Bearer ', '') ?? null;
}

profileRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase.from('profiles').select('*').eq('id', req.userId!).single();

  if (error) {
    res.status(404).json({ error: 'Perfil no encontrado' });
    return;
  }

  res.json(data);
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
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
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

  res.json(data);
});

profileRouter.get('/:username', async (req, res) => {
  const { data, error } = await supabaseAnon
    .from('profiles')
    .select('id, username, display_name, avatar_url, favorite_team, country, city, bio, created_at')
    .eq('username', req.params.username)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  res.json(data);
});

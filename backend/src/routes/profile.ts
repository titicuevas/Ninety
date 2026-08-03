import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { validateImageBuffer } from '../lib/contentModeration.js';
import {
  deleteAvatarByUrl,
  isManagedAvatarUrl,
  uploadAvatarBuffer,
} from '../lib/ensureStorage.js';
import { normalizeProfile, profileUpdatePayload } from '../lib/profileNormalize.js';
import { syncUserProfile } from '../lib/syncUserProfile.js';
import { createUserClient, supabaseAdmin, supabaseAnon } from '../lib/supabase.js';
import { notifyUser } from '../lib/notifyUser.js';
import { rankDiscoverProfiles, favoriteTeamIlikePattern } from '../lib/discoverProfiles.js';
import { isMissingFollowsTable, listFollowProfiles, type FollowListKind } from '../lib/userFollows.js';
import { normalizeUsernameParam } from '../lib/usernameParam.js';
import { optionalAuth, requireAuth, type AuthRequest } from '../middleware/auth.js';

export const profileRouter = Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo JPG, PNG o WebP.'));
  },
});

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
  bio: z.string().max(280).optional().nullable(),
});

const followListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});

function getAccessToken(req: AuthRequest): string | null {
  return req.headers.authorization?.replace('Bearer ', '') ?? null;
}

function routeUsername(req: AuthRequest): string {
  return normalizeUsernameParam(req.params.username);
}

function getReaderClient(token: string | null) {
  if (token) return createUserClient(token);
  if (supabaseAdmin) return supabaseAdmin;
  return null;
}

async function resolveProfileByUsername(username: string) {
  const normalized = normalizeUsernameParam(username);
  if (!normalized) return null;

  const { data, error } = await supabaseAnon
    .from('profiles')
    .select('id, username')
    .eq('username', normalized)
    .single();

  if (error || !data) return null;
  return data;
}

async function handleFollowList(req: AuthRequest, res: import('express').Response, kind: FollowListKind) {
  const token = getAccessToken(req);
  const reader = getReaderClient(token);
  if (!reader) {
    res.status(503).json({ error: 'Listas de seguimiento no disponibles temporalmente' });
    return;
  }

  const parsed = followListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const username = routeUsername(req);
  const target = await resolveProfileByUsername(username);
  if (!target) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  try {
    const result = await listFollowProfiles(reader, target.id, kind, {
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      viewerId: req.userId,
    });
    res.json({
      profiles: result.profiles,
      total: result.total,
      kind,
      username: target.username,
    });
  } catch (error) {
    if (isMissingFollowsTable(error)) {
      res.status(503).json({ error: 'Función de seguir no disponible. Ejecuta la migración user_follows.' });
      return;
    }
    const message = error instanceof Error ? error.message : 'No se pudo cargar la lista';
    res.status(400).json({ error: message });
  }
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

const usernameAvailableQuerySchema = z.object({
  u: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guiones bajos'),
});

profileRouter.get('/username-available', requireAuth, async (req: AuthRequest, res) => {
  const parsed = usernameAvailableQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ available: false, reason: 'invalid' });
    return;
  }

  const username = parsed.data.u;
  const { data, error } = await supabaseAnon
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (!data) {
    res.json({ available: true, username });
    return;
  }

  if (data.id === req.userId) {
    res.json({ available: true, username, own: true });
    return;
  }

  res.json({ available: false, username });
});

profileRouter.post('/avatar', requireAuth, avatarUpload.single('avatar'), async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No se recibió ninguna foto.' });
    return;
  }

  const imageError = validateImageBuffer(file.buffer, file.mimetype);
  if (imageError) {
    res.status(400).json({ error: imageError });
    return;
  }

  const supabase = createUserClient(token);
  const { data: current, error: currentError } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', req.userId!)
    .maybeSingle();

  if (currentError) {
    res.status(400).json({ error: currentError.message });
    return;
  }

  try {
    const url = await uploadAvatarBuffer(req.userId!, file.buffer, file.mimetype);
    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', req.userId!)
      .select()
      .single();

    if (error || !data) {
      res.status(400).json({ error: error?.message ?? 'No se pudo guardar el avatar' });
      return;
    }

    if (current?.avatar_url && isManagedAvatarUrl(current.avatar_url) && current.avatar_url !== url) {
      await deleteAvatarByUrl(current.avatar_url);
    }

    res.json(normalizeProfile(data));
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'No se pudo subir el avatar',
    });
  }
});

profileRouter.delete('/avatar', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { data: current, error: currentError } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', req.userId!)
    .maybeSingle();

  if (currentError) {
    res.status(400).json({ error: currentError.message });
    return;
  }

  const previousUrl = current?.avatar_url ?? null;
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', req.userId!)
    .select()
    .single();

  if (error || !data) {
    res.status(400).json({ error: error?.message ?? 'No se pudo quitar el avatar' });
    return;
  }

  if (isManagedAvatarUrl(previousUrl)) {
    await deleteAvatarByUrl(previousUrl!);
  }

  res.json(normalizeProfile(data));
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(40),
  limit: z.coerce.number().int().min(1).max(20).default(12),
});

profileRouter.get('/search', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Escribe al menos 2 caracteres para buscar aficionados' });
    return;
  }

  const q = parsed.data.q.toLowerCase();
  const safe = q.replace(/[%_,.()"]/g, '').trim();
  if (safe.length < 2) {
    res.status(400).json({ error: 'Escribe al menos 2 caracteres para buscar aficionados' });
    return;
  }

  const pattern = `%${safe}%`;
  const supabase = createUserClient(token);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, favorite_team, country, city, created_at')
    .not('username', 'is', null)
    .or(`username.ilike."${pattern}",full_name.ilike."${pattern}"`)
    .neq('id', req.userId!)
    .order('username', { ascending: true })
    .limit(parsed.data.limit);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const profiles = (data ?? [])
    .filter((row) => row.username)
    .map((row) => normalizeProfile(row));

  const ids = profiles.map((profile) => profile.id);
  let followedSet = new Set<string>();
  if (ids.length > 0) {
    const { data: followRows, error: followError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', req.userId!)
      .in('following_id', ids);

    if (followError) {
      if (!isMissingFollowsTable(followError)) {
        res.status(400).json({ error: followError.message });
        return;
      }
    } else {
      followedSet = new Set((followRows ?? []).map((row) => row.following_id));
    }
  }

  res.json({
    profiles: profiles.map((profile) => ({
      ...profile,
      followed_by_me: followedSet.has(profile.id),
    })),
    query: parsed.data.q,
  });
});

profileRouter.get('/discover', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 12);
  const supabase = createUserClient(token);
  const profileSelect =
    'id, username, full_name, avatar_url, favorite_team, country, city, created_at';

  const [{ data: me }, { data: followingRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('favorite_team, city, country')
      .eq('id', req.userId!)
      .maybeSingle(),
    supabase.from('user_follows').select('following_id').eq('follower_id', req.userId!),
  ]);

  const followingIds = new Set((followingRows ?? []).map((row) => row.following_id));
  const teamPattern = me?.favorite_team ? favoriteTeamIlikePattern(me.favorite_team) : null;

  type DiscoverRow = {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    favorite_team: string | null;
    country: string | null;
    city: string | null;
    created_at: string;
  };

  const recentQuery = supabase
    .from('profiles')
    .select(profileSelect)
    .not('username', 'is', null)
    .neq('id', req.userId!)
    .order('created_at', { ascending: false })
    .limit(Math.max(limit * 8, 40));

  const teamQuery = teamPattern
    ? supabase
        .from('profiles')
        .select(profileSelect)
        .not('username', 'is', null)
        .neq('id', req.userId!)
        .ilike('favorite_team', teamPattern)
        .limit(24)
    : Promise.resolve({ data: [] as DiscoverRow[], error: null });

  const [recentResult, teamResult] = await Promise.all([recentQuery, teamQuery]);

  if (recentResult.error) {
    res.status(400).json({ error: recentResult.error.message });
    return;
  }
  if (teamResult.error) {
    res.status(400).json({ error: teamResult.error.message });
    return;
  }

  const byId = new Map<string, DiscoverRow>();
  for (const row of [...(teamResult.data ?? []), ...(recentResult.data ?? [])] as DiscoverRow[]) {
    byId.set(row.id, row);
  }

  const ranked = rankDiscoverProfiles(
    [...byId.values()].filter((row): row is DiscoverRow & { username: string } => !!row.username),
    me ?? {},
    followingIds,
    limit,
  );

  const profiles = ranked.map(({ match_reason, ...row }) => ({
    ...normalizeProfile(row),
    followed_by_me: false,
    match_reason,
  }));

  res.json({ profiles });
});

profileRouter.get('/:username/followers', optionalAuth, (req: AuthRequest, res) => {
  void handleFollowList(req, res, 'followers');
});

profileRouter.get('/:username/following', optionalAuth, (req: AuthRequest, res) => {
  void handleFollowList(req, res, 'following');
});

profileRouter.post('/:username/follow', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const username = routeUsername(req);
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

  notifyUser({ userId: target.id, actorId: req.userId!, type: 'follow' });
  res.status(201).json({ followed: true });
});

profileRouter.delete('/:username/follow', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const username = routeUsername(req);
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
  const username = normalizeUsernameParam(req.params.username);
  if (!username) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const { data, error } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url, favorite_team, country, city, bio, created_at')
    .eq('username', username)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  res.json(normalizeProfile(data));
});

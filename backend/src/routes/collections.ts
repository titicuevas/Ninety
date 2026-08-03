import { Router } from 'express';
import { z } from 'zod';
import { buildCollectionReorder } from '../lib/collectionReorder.js';
import { nextUniqueSlug, slugifyCollectionName } from '../lib/collectionSlug.js';
import { createUserClient, supabaseAdmin, supabaseAnon } from '../lib/supabase.js';
import { optionalAuth, requireAuth, type AuthRequest } from '../middleware/auth.js';

function collectionAuthor(profile: {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}) {
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.full_name,
    avatar_url: profile.avatar_url,
  };
}

export const collectionsRouter = Router();

const MAX_COLLECTIONS_PER_USER = 50;
const MAX_ITEMS_PER_COLLECTION = 100;

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  is_public: z.boolean().optional().default(true),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  is_public: z.boolean().optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .optional(),
});

const addItemSchema = z.object({
  capsule_id: z.string().uuid(),
});

const reorderItemsSchema = z.object({
  capsule_ids: z.array(z.string().uuid()).min(1).max(MAX_ITEMS_PER_COLLECTION),
});

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function getAccessToken(req: AuthRequest): string | null {
  return req.headers.authorization?.replace('Bearer ', '') ?? null;
}

function getReaderClient(token: string | null) {
  if (token) return createUserClient(token);
  if (supabaseAdmin) return supabaseAdmin;
  return null;
}

function isMissingCollectionsTable(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    error?.code === '42P01' ||
    (message.includes('collections') &&
      (message.includes('schema cache') ||
        message.includes('Could not find') ||
        message.includes('does not exist')))
  );
}

function collectionsMigrationHint(): string {
  return 'Colecciones no disponibles: aplica la migración supabase/migrations/20250802120000_collections.sql en el SQL Editor de Supabase.';
}

type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type CapsuleLite = {
  id: string;
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
};

async function loadItemCounts(
  reader: ReturnType<typeof createUserClient>,
  collectionIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (collectionIds.length === 0) return counts;

  const { data, error } = await reader
    .from('collection_items')
    .select('collection_id')
    .in('collection_id', collectionIds);

  if (error || !data) return counts;

  for (const row of data) {
    const id = row.collection_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

async function loadCollectionItems(
  reader: ReturnType<typeof createUserClient>,
  collectionId: string,
  opts: { onlyPublicCapsules: boolean },
): Promise<CapsuleLite[]> {
  const { data: items, error } = await reader
    .from('collection_items')
    .select('capsule_id, position')
    .eq('collection_id', collectionId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !items?.length) return [];

  const capsuleIds = items.map((row) => row.capsule_id as string);
  let query = reader.from('capsules').select(
    'id, home_team_name, away_team_name, home_team_crest, away_team_crest, competition_name, home_score, away_score, watched_at, rating, note, photo_urls, is_public, watch_context',
  ).in('id', capsuleIds);

  if (opts.onlyPublicCapsules) {
    query = query.eq('is_public', true);
  }

  const { data: capsules, error: capsulesError } = await query;
  if (capsulesError || !capsules) return [];

  const byId = new Map(capsules.map((c) => [c.id as string, c as CapsuleLite]));
  return items
    .map((row) => byId.get(row.capsule_id as string))
    .filter((c): c is CapsuleLite => !!c);
}

async function resolveTakenSlugs(
  supabase: ReturnType<typeof createUserClient>,
  userId: string,
  exceptId?: string,
): Promise<Set<string>> {
  const { data } = await supabase.from('collections').select('id, slug').eq('user_id', userId);
  const taken = new Set<string>();
  for (const row of data ?? []) {
    if (exceptId && row.id === exceptId) continue;
    taken.add(row.slug as string);
  }
  return taken;
}

/** GET /api/collections/me */
collectionsRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', req.userId!)
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingCollectionsTable(error)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  const rows = (data ?? []) as CollectionRow[];
  const counts = await loadItemCounts(supabase, rows.map((r) => r.id));

  res.json({
    collections: rows.map((row) => ({
      ...row,
      items_count: counts.get(row.id) ?? 0,
    })),
  });
});

/** GET /api/collections/me/containing/:capsuleId — ids de colecciones propias con esa Capsule */
collectionsRouter.get('/me/containing/:capsuleId', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const capsuleId = routeParam(req.params.capsuleId);
  if (!capsuleId) {
    res.status(400).json({ error: 'capsuleId requerido' });
    return;
  }

  const supabase = createUserClient(token);

  const { data: ownCollections, error: collectionsError } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', req.userId!);

  if (collectionsError) {
    if (isMissingCollectionsTable(collectionsError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: collectionsError.message });
    return;
  }

  const collectionIds = (ownCollections ?? []).map((row) => row.id as string);
  if (collectionIds.length === 0) {
    res.json({ collection_ids: [] as string[] });
    return;
  }

  const { data: items, error: itemsError } = await supabase
    .from('collection_items')
    .select('collection_id')
    .eq('capsule_id', capsuleId)
    .in('collection_id', collectionIds);

  if (itemsError) {
    if (isMissingCollectionsTable(itemsError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: itemsError.message });
    return;
  }

  res.json({
    collection_ids: (items ?? []).map((row) => row.collection_id as string),
  });
});

/** POST /api/collections */
collectionsRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const supabase = createUserClient(token);

  const { count, error: countError } = await supabase
    .from('collections')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', req.userId!);

  if (countError) {
    if (isMissingCollectionsTable(countError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: countError.message });
    return;
  }

  if ((count ?? 0) >= MAX_COLLECTIONS_PER_USER) {
    res.status(400).json({ error: `Máximo ${MAX_COLLECTIONS_PER_USER} colecciones` });
    return;
  }

  const taken = await resolveTakenSlugs(supabase, req.userId!);
  const desired = parsed.data.slug ?? slugifyCollectionName(parsed.data.name);
  const slug = nextUniqueSlug(desired, taken);

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: req.userId!,
      name: parsed.data.name,
      slug,
      description: parsed.data.description ?? null,
      is_public: parsed.data.is_public,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ya existe una colección con ese slug' });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json({ collection: { ...data, items_count: 0 } });
});

/** GET /api/collections/user/:username — listas públicas */
collectionsRouter.get('/user/:username', optionalAuth, async (req: AuthRequest, res) => {
  const username = routeParam(req.params.username);
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Colecciones no disponibles temporalmente' });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const isOwner = req.userId === profile.id;
  let query = reader.from('collections').select('*').eq('user_id', profile.id);
  if (!isOwner) {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    if (isMissingCollectionsTable(error)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  const rows = (data ?? []) as CollectionRow[];
  const counts = await loadItemCounts(reader, rows.map((r) => r.id));
  const author = collectionAuthor(profile);

  res.json({
    profile: author,
    collections: rows.map((row) => ({
      ...row,
      items_count: counts.get(row.id) ?? 0,
    })),
  });
});

/** GET /api/collections/user/:username/:slug — detalle público */
collectionsRouter.get('/user/:username/:slug', optionalAuth, async (req: AuthRequest, res) => {
  const username = routeParam(req.params.username);
  const slug = routeParam(req.params.slug);
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Colecciones no disponibles temporalmente' });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const isOwner = req.userId === profile.id;

  let query = reader
    .from('collections')
    .select('*')
    .eq('user_id', profile.id)
    .eq('slug', slug);

  if (!isOwner) {
    query = query.eq('is_public', true);
  }

  const { data: collection, error } = await query.maybeSingle();

  if (error) {
    if (isMissingCollectionsTable(error)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (!collection) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  const capsules = await loadCollectionItems(reader, collection.id as string, {
    onlyPublicCapsules: !isOwner,
  });

  res.json({
    profile: collectionAuthor(profile),
    collection: {
      ...(collection as CollectionRow),
      items_count: capsules.length,
    },
    capsules,
  });
});

/** GET /api/collections/:id — detalle propio (o público si is_public) */
collectionsRouter.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  const id = routeParam(req.params.id);
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Colecciones no disponibles temporalmente' });
    return;
  }

  const { data: collection, error } = await reader.from('collections').select('*').eq('id', id).maybeSingle();

  if (error) {
    if (isMissingCollectionsTable(error)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (!collection) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  const isOwner = req.userId === collection.user_id;
  if (!isOwner && !collection.is_public) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  const capsules = await loadCollectionItems(reader, collection.id as string, {
    onlyPublicCapsules: !isOwner,
  });

  const { data: profile } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', collection.user_id)
    .maybeSingle();

  res.json({
    profile: profile ? collectionAuthor(profile) : null,
    collection: {
      ...(collection as CollectionRow),
      items_count: capsules.length,
    },
    capsules,
  });
});

/** PATCH /api/collections/:id */
collectionsRouter.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: 'Nada que actualizar' });
    return;
  }

  const id = routeParam(req.params.id);
  const supabase = createUserClient(token);

  const { data: existing, error: existingError } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (existingError) {
    if (isMissingCollectionsTable(existingError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: existingError.message });
    return;
  }

  if (!existing) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.is_public !== undefined) patch.is_public = parsed.data.is_public;

  if (parsed.data.slug !== undefined || parsed.data.name !== undefined) {
    const taken = await resolveTakenSlugs(supabase, req.userId!, id);
    const desired =
      parsed.data.slug ??
      (parsed.data.name ? slugifyCollectionName(parsed.data.name) : (existing.slug as string));
    patch.slug = nextUniqueSlug(desired, taken);
  }

  const { data, error } = await supabase
    .from('collections')
    .update(patch)
    .eq('id', id)
    .eq('user_id', req.userId!)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ya existe una colección con ese slug' });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  const counts = await loadItemCounts(supabase, [id]);
  res.json({ collection: { ...data, items_count: counts.get(id) ?? 0 } });
});

/** DELETE /api/collections/:id */
collectionsRouter.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const id = routeParam(req.params.id);
  const supabase = createUserClient(token);

  const { error, count } = await supabase
    .from('collections')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', req.userId!);

  if (error) {
    if (isMissingCollectionsTable(error)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (!count) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  res.status(204).send();
});

/** PUT /api/collections/:id/items/reorder — orden curado (columna `position`) */
collectionsRouter.put('/:id/items/reorder', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = reorderItemsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const id = routeParam(req.params.id);
  const supabase = createUserClient(token);

  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (collectionError) {
    if (isMissingCollectionsTable(collectionError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: collectionError.message });
    return;
  }

  if (!collection) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  const { data: items, error: itemsError } = await supabase
    .from('collection_items')
    .select('capsule_id')
    .eq('collection_id', id);

  if (itemsError) {
    if (isMissingCollectionsTable(itemsError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: itemsError.message });
    return;
  }

  const currentIds = (items ?? []).map((row) => row.capsule_id as string);
  const reorder = buildCollectionReorder(currentIds, parsed.data.capsule_ids);
  if (!reorder.ok) {
    res.status(400).json({ error: reorder.error });
    return;
  }

  for (const { capsule_id, position } of reorder.positions) {
    const { error } = await supabase
      .from('collection_items')
      .update({ position })
      .eq('collection_id', id)
      .eq('capsule_id', capsule_id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
  }

  await supabase
    .from('collections')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', req.userId!);

  res.json({
    items: reorder.positions.map(({ capsule_id, position }) => ({
      collection_id: id,
      capsule_id,
      position,
    })),
  });
});

/** POST /api/collections/:id/items */
collectionsRouter.post('/:id/items', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const id = routeParam(req.params.id);
  const supabase = createUserClient(token);

  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (collectionError) {
    if (isMissingCollectionsTable(collectionError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: collectionError.message });
    return;
  }

  if (!collection) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  const { count } = await supabase
    .from('collection_items')
    .select('capsule_id', { count: 'exact', head: true })
    .eq('collection_id', id);

  if ((count ?? 0) >= MAX_ITEMS_PER_COLLECTION) {
    res.status(400).json({ error: `Máximo ${MAX_ITEMS_PER_COLLECTION} Capsules por colección` });
    return;
  }

  const { data: capsule, error: capsuleError } = await supabase
    .from('capsules')
    .select('id')
    .eq('id', parsed.data.capsule_id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (capsuleError) {
    res.status(400).json({ error: capsuleError.message });
    return;
  }

  if (!capsule) {
    res.status(404).json({ error: 'Capsule no encontrada en tu diario' });
    return;
  }

  const { data: item, error } = await supabase
    .from('collection_items')
    .insert({
      collection_id: id,
      capsule_id: parsed.data.capsule_id,
      position: count ?? 0,
    })
    .select('collection_id, capsule_id, position, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Esa Capsule ya está en la colección' });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  await supabase
    .from('collections')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', req.userId!);

  res.status(201).json({ item });
});

/** DELETE /api/collections/:id/items/:capsuleId */
collectionsRouter.delete('/:id/items/:capsuleId', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const id = routeParam(req.params.id);
  const capsuleId = routeParam(req.params.capsuleId);
  const supabase = createUserClient(token);

  const { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (!collection) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  const { error, count } = await supabase
    .from('collection_items')
    .delete({ count: 'exact' })
    .eq('collection_id', id)
    .eq('capsule_id', capsuleId);

  if (error) {
    if (isMissingCollectionsTable(error)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (!count) {
    res.status(404).json({ error: 'Capsule no está en la colección' });
    return;
  }

  await supabase
    .from('collections')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', req.userId!);

  res.status(204).send();
});

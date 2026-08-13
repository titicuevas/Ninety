import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { resolveCollectionCoverUrl } from '../lib/collectionCover.js';
import {
  canEngageCollectionComments,
  collectionCommentsMigrationHint,
  fetchCollectionCommentsWithAuthors,
  isMissingCollectionCommentsTable,
} from '../lib/collectionComments.js';
import {
  attachCollectionLikeStats,
  canEngageCollectionLikes,
  collectionLikesMigrationHint,
  fetchCollectionLikesWithProfiles,
  isMissingCollectionLikesTable,
} from '../lib/collectionLikes.js';
import { buildCollectionReorder } from '../lib/collectionReorder.js';
import { nextUniqueSlug, slugifyCollectionName } from '../lib/collectionSlug.js';
import {
  buildCollectionsExportJson,
  toExportCollection,
  type ExportCollection,
} from '../lib/collectionsExport.js';
import {
  COLLECTIONS_IMPORT_MAX,
  COLLECTIONS_IMPORT_MAX_ITEMS,
  buildCollectionsImportSummary,
  formatCollectionsImportSummary,
  parseCollectionsImportPayload,
} from '../lib/collectionsImport.js';
import { validateCommentBody } from '../lib/contentModeration.js';
import { rankDiscoverCollections } from '../lib/discoverCollections.js';
import { createUserClient, supabaseAdmin, supabaseAnon } from '../lib/supabase.js';
import { notifyUser } from '../lib/notifyUser.js';
import {
  followRelationFlags,
  isMissingFollowsTable,
  loadFollowRelationSets,
} from '../lib/userFollows.js';
import {
  getBlockRelation,
  isBlockActive,
  listBlockedEitherWayIds,
} from '../lib/userBlocks.js';
import { normalizeUsernameParam } from '../lib/usernameParam.js';
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
  cover_capsule_id: z.string().uuid().nullable().optional(),
});

const addItemSchema = z.object({
  capsule_id: z.string().uuid(),
});

const reorderItemsSchema = z.object({
  capsule_ids: z.array(z.string().uuid()).min(1).max(MAX_ITEMS_PER_COLLECTION),
});

const commentBodySchema = z.object({
  body: z.string().trim().min(1).max(500),
});

const commentLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados comentarios. Inténtalo en un minuto.' },
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
  return 'Colecciones no disponibles: aplica las migraciones supabase/migrations/20250802120000_collections.sql y 20250810160000_collection_cover.sql en el SQL Editor de Supabase.';
}

function isMissingCoverColumn(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('cover_capsule_id') &&
    (message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('does not exist') ||
      message.includes('column'))
  );
}

function coverMigrationHint(): string {
  return 'Portada de colección no disponible: aplica supabase/migrations/20250810160000_collection_cover.sql en el SQL Editor de Supabase.';
}

type CollectionRow = {
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

/** Resuelve cover_url por colección (destacada o primera foto en orden). */
async function loadCoverUrls(
  reader: ReturnType<typeof createUserClient>,
  rows: CollectionRow[],
  opts: { onlyPublicCapsules?: boolean } = {},
): Promise<Map<string, string | null>> {
  const covers = new Map<string, string | null>();
  if (rows.length === 0) return covers;

  const { data: items } = await reader
    .from('collection_items')
    .select('collection_id, capsule_id, position')
    .in(
      'collection_id',
      rows.map((row) => row.id),
    )
    .order('position', { ascending: true });

  const orderedByCollection = new Map<string, string[]>();
  for (const item of items ?? []) {
    const collectionId = item.collection_id as string;
    const list = orderedByCollection.get(collectionId) ?? [];
    list.push(item.capsule_id as string);
    orderedByCollection.set(collectionId, list);
  }

  const capsuleIds = [
    ...new Set([
      ...rows.map((row) => row.cover_capsule_id).filter((id): id is string => !!id),
      ...[...orderedByCollection.values()].flat(),
    ]),
  ];

  const photoByCapsule = new Map<string, string[]>();
  if (capsuleIds.length > 0) {
    let query = reader.from('capsules').select('id, photo_urls, is_public').in('id', capsuleIds);
    if (opts.onlyPublicCapsules) {
      query = query.eq('is_public', true);
    }
    const { data: capsules } = await query;
    for (const capsule of capsules ?? []) {
      const urls = Array.isArray(capsule.photo_urls)
        ? (capsule.photo_urls as string[])
        : [];
      photoByCapsule.set(capsule.id as string, urls);
    }
  }

  for (const row of rows) {
    const orderedIds = (orderedByCollection.get(row.id) ?? []).filter((id) =>
      photoByCapsule.has(id),
    );
    const capsules = orderedIds.map((id) => ({
      id,
      photo_urls: photoByCapsule.get(id) ?? [],
    }));
    const featuredId = row.cover_capsule_id ?? null;
    covers.set(
      row.id,
      resolveCollectionCoverUrl({
        coverCapsuleId: featuredId && photoByCapsule.has(featuredId) ? featuredId : null,
        capsules,
      }),
    );
  }

  return covers;
}

function serializeCollection(
  row: CollectionRow,
  extras: {
    items_count?: number;
    cover_url?: string | null;
    likes_count?: number;
    liked_by_me?: boolean;
  },
) {
  return {
    ...row,
    cover_capsule_id: row.cover_capsule_id ?? null,
    items_count: extras.items_count ?? 0,
    cover_url: extras.cover_url ?? null,
    likes_count: extras.likes_count ?? 0,
    liked_by_me: extras.liked_by_me ?? false,
  };
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
  const ids = rows.map((r) => r.id);
  const counts = await loadItemCounts(supabase, ids);
  const coverUrls = await loadCoverUrls(supabase, rows);
  const withLikes = await attachCollectionLikeStats(supabase, req.userId!, rows);

  res.json({
    collections: withLikes.map((row) =>
      serializeCollection(row, {
        items_count: counts.get(row.id) ?? 0,
        cover_url: coverUrls.get(row.id) ?? null,
        likes_count: row.likes_count,
        liked_by_me: row.liked_by_me,
      }),
    ),
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

/** GET /api/collections/me/export — backup GDPR de colecciones (match_id, sin secretos). */
collectionsRouter.get('/me/export', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const supabase = createUserClient(token);

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('id', req.userId!)
    .maybeSingle();

  const { data: collectionRows, error: collectionsError } = await supabase
    .from('collections')
    .select('id, name, slug, description, is_public, cover_capsule_id, created_at')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: true });

  if (collectionsError) {
    if (isMissingCollectionsTable(collectionsError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: collectionsError.message });
    return;
  }

  const rows = collectionRows ?? [];
  const collectionIds = rows.map((row) => row.id as string);

  const itemsByCollection = new Map<string, Array<{ capsule_id: string; position: number }>>();
  const capsuleIds = new Set<string>();

  if (collectionIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from('collection_items')
      .select('collection_id, capsule_id, position')
      .in('collection_id', collectionIds)
      .order('position', { ascending: true });

    if (itemsError) {
      res.status(400).json({ error: itemsError.message });
      return;
    }

    for (const item of itemRows ?? []) {
      const collectionId = item.collection_id as string;
      const capsuleId = item.capsule_id as string;
      const list = itemsByCollection.get(collectionId) ?? [];
      list.push({ capsule_id: capsuleId, position: Number(item.position) || 0 });
      itemsByCollection.set(collectionId, list);
      capsuleIds.add(capsuleId);
    }
  }

  for (const row of rows) {
    const coverId = row.cover_capsule_id as string | null | undefined;
    if (coverId) capsuleIds.add(coverId);
  }

  const matchByCapsule = new Map<string, number>();
  if (capsuleIds.size > 0) {
    const { data: capsules, error: capsulesError } = await supabase
      .from('capsules')
      .select('id, match_id')
      .eq('user_id', req.userId!)
      .in('id', [...capsuleIds]);

    if (capsulesError) {
      res.status(400).json({ error: capsulesError.message });
      return;
    }

    for (const capsule of capsules ?? []) {
      const matchId = Number(capsule.match_id);
      if (Number.isFinite(matchId) && matchId > 0) {
        matchByCapsule.set(capsule.id as string, matchId);
      }
    }
  }

  const collections: ExportCollection[] = rows.map((row) => {
    const rawItems = itemsByCollection.get(row.id as string) ?? [];
    const items = rawItems
      .map((item) => {
        const matchId = matchByCapsule.get(item.capsule_id);
        if (matchId == null) return null;
        return { match_id: matchId, position: item.position };
      })
      .filter((item): item is { match_id: number; position: number } => item != null);

    const coverCapsuleId = (row.cover_capsule_id as string | null | undefined) ?? null;
    const coverMatchId = coverCapsuleId ? (matchByCapsule.get(coverCapsuleId) ?? null) : null;

    return toExportCollection({
      name: String(row.name ?? ''),
      slug: String(row.slug ?? ''),
      description: (row.description as string | null) ?? null,
      is_public: row.is_public !== false,
      cover_match_id: coverMatchId,
      items,
    });
  });

  const username = (profile?.username as string | null) ?? 'ninety';
  const stamp = new Date().toISOString().slice(0, 10);
  const payload = {
    exported_at: new Date().toISOString(),
    format_version: 1 as const,
    kind: 'collections' as const,
    profile: {
      username: (profile?.username as string | null) ?? null,
      display_name: (profile?.full_name as string | null) ?? null,
    },
    collections,
  };

  const body = buildCollectionsExportJson(payload);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ninety-colecciones-${username}-${stamp}.json"`,
  );
  res.send(body);
});

/** POST /api/collections/me/import — restaura colecciones desde export JSON (GDPR). */
collectionsRouter.post('/me/import', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = parseCollectionsImportPayload(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const totalInFile =
    parsed.rows.length + parsed.skipped_invalid + parsed.skipped_duplicate_in_file;

  if (parsed.rows.length === 0) {
    const empty = buildCollectionsImportSummary({
      imported: 0,
      skipped_duplicate: 0,
      skipped_invalid: parsed.skipped_invalid,
      skipped_duplicate_in_file: parsed.skipped_duplicate_in_file,
      skipped_invalid_items: parsed.skipped_invalid_items,
      skipped_missing_capsule: 0,
      skipped_limit: 0,
      items_linked: 0,
      total_in_file: totalInFile,
    });
    res.json({ ...empty, message: formatCollectionsImportSummary(empty) });
    return;
  }

  const supabase = createUserClient(token);

  const { data: existingRows, error: existingError } = await supabase
    .from('collections')
    .select('id, slug')
    .eq('user_id', req.userId!);

  if (existingError) {
    if (isMissingCollectionsTable(existingError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: existingError.message });
    return;
  }

  const existingSlugs = new Set((existingRows ?? []).map((row) => row.slug as string));
  let remainingSlots = Math.max(0, COLLECTIONS_IMPORT_MAX - (existingRows?.length ?? 0));

  const allMatchIds = [
    ...new Set(parsed.rows.flatMap((row) => row.items.map((item) => item.match_id))),
  ];
  const capsuleByMatch = new Map<number, string>();

  if (allMatchIds.length > 0) {
    const { data: capsules, error: capsulesError } = await supabase
      .from('capsules')
      .select('id, match_id')
      .eq('user_id', req.userId!)
      .in('match_id', allMatchIds);

    if (capsulesError) {
      res.status(400).json({ error: capsulesError.message });
      return;
    }

    for (const capsule of capsules ?? []) {
      const matchId = Number(capsule.match_id);
      if (Number.isFinite(matchId) && matchId > 0 && !capsuleByMatch.has(matchId)) {
        capsuleByMatch.set(matchId, capsule.id as string);
      }
    }
  }

  let imported = 0;
  let skippedDuplicate = 0;
  let skippedLimit = 0;
  let skippedMissingCapsule = 0;
  let itemsLinked = 0;

  for (const row of parsed.rows) {
    if (existingSlugs.has(row.slug)) {
      skippedDuplicate += 1;
      continue;
    }
    if (remainingSlots <= 0) {
      skippedLimit += 1;
      continue;
    }

    const { data: created, error: createError } = await supabase
      .from('collections')
      .insert({
        user_id: req.userId!,
        name: row.name,
        slug: row.slug,
        description: row.description,
        is_public: row.is_public,
      })
      .select('id')
      .single();

    if (createError) {
      if (createError.code === '23505') {
        skippedDuplicate += 1;
        existingSlugs.add(row.slug);
        continue;
      }
      if (isMissingCollectionsTable(createError)) {
        res.status(503).json({ error: collectionsMigrationHint() });
        return;
      }
      res.status(400).json({ error: createError.message });
      return;
    }

    const collectionId = created.id as string;
    existingSlugs.add(row.slug);
    remainingSlots -= 1;
    imported += 1;

    const itemRows: Array<{ collection_id: string; capsule_id: string; position: number }> = [];
    for (const item of row.items.slice(0, COLLECTIONS_IMPORT_MAX_ITEMS)) {
      const capsuleId = capsuleByMatch.get(item.match_id);
      if (!capsuleId) {
        skippedMissingCapsule += 1;
        continue;
      }
      itemRows.push({
        collection_id: collectionId,
        capsule_id: capsuleId,
        position: itemRows.length,
      });
    }

    if (itemRows.length > 0) {
      const { error: itemsError } = await supabase.from('collection_items').insert(itemRows);
      if (itemsError) {
        res.status(400).json({ error: itemsError.message });
        return;
      }
      itemsLinked += itemRows.length;
    }

    if (row.cover_match_id != null) {
      const coverCapsuleId = capsuleByMatch.get(row.cover_match_id);
      const coverInCollection =
        coverCapsuleId != null && itemRows.some((item) => item.capsule_id === coverCapsuleId);
      if (coverInCollection && coverCapsuleId) {
        const { error: coverError } = await supabase
          .from('collections')
          .update({ cover_capsule_id: coverCapsuleId })
          .eq('id', collectionId)
          .eq('user_id', req.userId!);
        if (coverError && !isMissingCoverColumn(coverError)) {
          res.status(400).json({ error: coverError.message });
          return;
        }
      }
    }
  }

  const summary = buildCollectionsImportSummary({
    imported,
    skipped_duplicate: skippedDuplicate,
    skipped_invalid: parsed.skipped_invalid,
    skipped_duplicate_in_file: parsed.skipped_duplicate_in_file,
    skipped_invalid_items: parsed.skipped_invalid_items,
    skipped_missing_capsule: skippedMissingCapsule,
    skipped_limit: skippedLimit,
    items_linked: itemsLinked,
    total_in_file: totalInFile,
  });

  res.json({ ...summary, message: formatCollectionsImportSummary(summary) });
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

  res.status(201).json({
    collection: serializeCollection(data as CollectionRow, {
      items_count: 0,
      cover_url: null,
    }),
  });
});

/** GET /api/collections/discover — listas públicas ajenas (descubrimiento V8). */
collectionsRouter.get('/discover', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 24);
  const supabase = createUserClient(token);

  const [{ data: me }, { data: followingRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('favorite_team')
      .eq('id', req.userId!)
      .maybeSingle(),
    supabase.from('user_follows').select('following_id').eq('follower_id', req.userId!),
  ]);

  const followingIds = new Set((followingRows ?? []).map((row) => row.following_id as string));
  const blockedIds = new Set(await listBlockedEitherWayIds(req.userId!));
  const followedAuthorIds = [...followingIds].filter((id) => !blockedIds.has(id));

  const recentQuery = supabase
    .from('collections')
    .select('*')
    .eq('is_public', true)
    .neq('user_id', req.userId!)
    .order('updated_at', { ascending: false })
    .limit(Math.max(limit * 8, 40));

  const followedQuery =
    followedAuthorIds.length > 0
      ? supabase
          .from('collections')
          .select('*')
          .eq('is_public', true)
          .in('user_id', followedAuthorIds)
          .order('updated_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as CollectionRow[], error: null });

  const [recentResult, followedResult] = await Promise.all([recentQuery, followedQuery]);

  if (recentResult.error) {
    if (isMissingCollectionsTable(recentResult.error)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: recentResult.error.message });
    return;
  }
  if (followedResult.error) {
    if (isMissingCollectionsTable(followedResult.error)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: followedResult.error.message });
    return;
  }

  const byId = new Map<string, CollectionRow>();
  for (const row of [...(followedResult.data ?? []), ...(recentResult.data ?? [])] as CollectionRow[]) {
    byId.set(row.id, row);
  }

  const rows = [...byId.values()];
  if (rows.length === 0) {
    res.json({ collections: [] });
    return;
  }

  const authorIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, favorite_team')
    .in('id', authorIds)
    .not('username', 'is', null);

  if (profilesError) {
    res.status(400).json({ error: profilesError.message });
    return;
  }

  type ProfileLite = {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    favorite_team: string | null;
  };

  const profileById = new Map<string, ProfileLite>();
  for (const profile of (profiles ?? []) as ProfileLite[]) {
    if (profile.username) profileById.set(profile.id, profile);
  }

  const ids = rows.map((row) => row.id);
  const counts = await loadItemCounts(supabase, ids);
  const coverUrls = await loadCoverUrls(supabase, rows, { onlyPublicCapsules: true });

  const candidates = rows
    .map((row) => {
      if (blockedIds.has(row.user_id)) return null;
      const profile = profileById.get(row.user_id);
      if (!profile?.username) return null;
      return {
        ...row,
        items_count: counts.get(row.id) ?? 0,
        cover_url: coverUrls.get(row.id) ?? null,
        author: {
          id: profile.id,
          username: profile.username,
          display_name: profile.full_name,
          avatar_url: profile.avatar_url,
          favorite_team: profile.favorite_team,
        },
      };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);

  const ranked = rankDiscoverCollections(
    candidates,
    { id: req.userId!, favorite_team: me?.favorite_team },
    followingIds,
    limit,
  );

  const authorIdsRanked = [...new Set(ranked.map((row) => row.author.id))];
  let followedSet = new Set<string>();
  let followerSet = new Set<string>();
  if (authorIdsRanked.length > 0) {
    try {
      const relations = await loadFollowRelationSets(supabase, req.userId!, authorIdsRanked);
      followedSet = relations.followedSet;
      followerSet = relations.followerSet;
    } catch (err) {
      if (!isMissingFollowsTable(err)) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: message });
        return;
      }
    }
  }

  let likeById = new Map<string, { likes_count: number; liked_by_me: boolean }>();
  try {
    const withLikes = await attachCollectionLikeStats(
      supabase,
      req.userId!,
      ranked.map((row) => ({ id: row.id })),
    );
    likeById = new Map(withLikes.map((row) => [row.id, row]));
  } catch (err) {
    if (!isMissingCollectionLikesTable(err)) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
      return;
    }
  }

  res.json({
    collections: ranked.map(({ author, match_reason, ...collection }) => {
      const likes = likeById.get(collection.id);
      return {
        ...serializeCollection(collection, {
          items_count: collection.items_count,
          cover_url: collection.cover_url ?? null,
          likes_count: likes?.likes_count ?? 0,
          liked_by_me: likes?.liked_by_me ?? false,
        }),
        author: {
          ...author,
          ...followRelationFlags(author.id, req.userId!, followedSet, followerSet),
        },
        match_reason,
      };
    }),
  });
});

/** GET /api/collections/user/:username — listas públicas */
collectionsRouter.get('/user/:username', optionalAuth, async (req: AuthRequest, res) => {
  const username = normalizeUsernameParam(req.params.username);
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Colecciones no disponibles temporalmente' });
    return;
  }

  if (!username) {
    res.status(404).json({ error: 'Usuario no encontrado' });
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

  if (req.userId && req.userId !== profile.id) {
    const block = await getBlockRelation(req.userId, profile.id);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
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
  const ids = rows.map((r) => r.id);
  const counts = await loadItemCounts(reader, ids);
  const coverUrls = await loadCoverUrls(reader, rows, { onlyPublicCapsules: !isOwner });
  const author = collectionAuthor(profile);
  const withLikes = await attachCollectionLikeStats(reader, req.userId ?? '', rows);

  res.json({
    profile: author,
    collections: withLikes.map((row) =>
      serializeCollection(row, {
        items_count: counts.get(row.id) ?? 0,
        cover_url: coverUrls.get(row.id) ?? null,
        likes_count: row.likes_count,
        liked_by_me: row.liked_by_me,
      }),
    ),
  });
});

/** GET /api/collections/user/:username/:slug — detalle público */
collectionsRouter.get('/user/:username/:slug', optionalAuth, async (req: AuthRequest, res) => {
  const username = normalizeUsernameParam(req.params.username);
  const slug = routeParam(req.params.slug);
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Colecciones no disponibles temporalmente' });
    return;
  }

  if (!username) {
    res.status(404).json({ error: 'Usuario no encontrado' });
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

  if (req.userId && req.userId !== profile.id) {
    const block = await getBlockRelation(req.userId, profile.id);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Colección no encontrada' });
      return;
    }
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
  const row = collection as CollectionRow;
  const [withLikes] = await attachCollectionLikeStats(reader, req.userId ?? '', [row]);

  res.json({
    profile: collectionAuthor(profile),
    collection: serializeCollection(withLikes ?? row, {
      items_count: capsules.length,
      cover_url: resolveCollectionCoverUrl({
        coverCapsuleId: row.cover_capsule_id ?? null,
        capsules,
      }),
      likes_count: withLikes?.likes_count ?? 0,
      liked_by_me: withLikes?.liked_by_me ?? false,
    }),
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

  if (req.userId && !isOwner) {
    const block = await getBlockRelation(req.userId, collection.user_id as string);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Colección no encontrada' });
      return;
    }
  }

  const capsules = await loadCollectionItems(reader, collection.id as string, {
    onlyPublicCapsules: !isOwner,
  });

  const { data: profile } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', collection.user_id)
    .maybeSingle();

  const row = collection as CollectionRow;
  const [withLikes] = await attachCollectionLikeStats(reader, req.userId ?? '', [row]);
  res.json({
    profile: profile ? collectionAuthor(profile) : null,
    collection: serializeCollection(withLikes ?? row, {
      items_count: capsules.length,
      cover_url: resolveCollectionCoverUrl({
        coverCapsuleId: row.cover_capsule_id ?? null,
        capsules,
      }),
      likes_count: withLikes?.likes_count ?? 0,
      liked_by_me: withLikes?.liked_by_me ?? false,
    }),
    capsules,
  });
});

const collectionLikesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** POST /api/collections/:id/like — me gusta (solo listas públicas o propias) */
collectionsRouter.post('/:id/like', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const id = routeParam(req.params.id);
  const supabase = createUserClient(token);
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id, user_id, is_public')
    .eq('id', id)
    .maybeSingle();

  if (collectionError) {
    if (isMissingCollectionsTable(collectionError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: collectionError.message });
    return;
  }

  if (!collection || !canEngageCollectionLikes(collection, req.userId)) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  if (req.userId !== collection.user_id) {
    const block = await getBlockRelation(req.userId!, collection.user_id);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Colección no encontrada' });
      return;
    }
  }

  const { error } = await supabase.from('collection_likes').insert({
    user_id: req.userId!,
    collection_id: collection.id,
  });

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ya diste like a esta colección' });
      return;
    }
    if (isMissingCollectionLikesTable(error)) {
      res.status(503).json({ error: collectionLikesMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (collection.user_id !== req.userId) {
    notifyUser({
      userId: collection.user_id,
      actorId: req.userId!,
      type: 'collection_like',
      collectionId: collection.id,
    });
  }

  res.status(201).json({ liked: true });
});

/** DELETE /api/collections/:id/like */
collectionsRouter.delete('/:id/like', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const id = routeParam(req.params.id);
  const supabase = createUserClient(token);

  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id, user_id, is_public')
    .eq('id', id)
    .maybeSingle();

  if (collectionError) {
    if (isMissingCollectionsTable(collectionError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: collectionError.message });
    return;
  }

  if (!collection || !canEngageCollectionLikes(collection, req.userId)) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  if (req.userId !== collection.user_id) {
    const block = await getBlockRelation(req.userId!, collection.user_id);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Colección no encontrada' });
      return;
    }
  }

  const { error, count } = await supabase
    .from('collection_likes')
    .delete({ count: 'exact' })
    .eq('collection_id', collection.id)
    .eq('user_id', req.userId!);

  if (error) {
    if (isMissingCollectionLikesTable(error)) {
      res.status(503).json({ error: collectionLikesMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (!count) {
    res.status(404).json({ error: 'No había like en esta colección' });
    return;
  }

  res.status(204).end();
});

/** GET /api/collections/:id/likes — quién dio me gusta */
collectionsRouter.get('/:id/likes', optionalAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Likes no disponibles temporalmente' });
    return;
  }

  const parsed = collectionLikesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const id = routeParam(req.params.id);
  const { data: collection, error: collectionError } = await reader
    .from('collections')
    .select('id, user_id, is_public')
    .eq('id', id)
    .maybeSingle();

  if (collectionError) {
    if (isMissingCollectionsTable(collectionError)) {
      res.status(503).json({ error: collectionsMigrationHint() });
      return;
    }
    res.status(400).json({ error: collectionError.message });
    return;
  }

  if (!collection || !canEngageCollectionLikes(collection, req.userId)) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  if (req.userId && req.userId !== collection.user_id) {
    const block = await getBlockRelation(req.userId, collection.user_id);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Colección no encontrada' });
      return;
    }
  }

  try {
    const page = await fetchCollectionLikesWithProfiles(reader, collection.id, {
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      viewerId: req.userId,
    });
    res.json(page);
  } catch (err) {
    if (isMissingCollectionLikesTable(err)) {
      res.status(503).json({ error: collectionLikesMigrationHint() });
      return;
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error al cargar likes' });
  }
});

async function loadCollectionForComments(
  reader: ReturnType<typeof createUserClient>,
  collectionId: string,
): Promise<{ id: string; user_id: string; is_public: boolean } | null | 'missing' | 'error'> {
  const { data, error } = await reader
    .from('collections')
    .select('id, user_id, is_public')
    .eq('id', collectionId)
    .maybeSingle();

  if (error) {
    if (isMissingCollectionsTable(error)) return 'missing';
    return 'error';
  }
  return data;
}

/** GET /api/collections/:id/comments */
collectionsRouter.get('/:id/comments', optionalAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  const reader = getReaderClient(token);
  if (!reader) {
    res.status(503).json({ error: 'Comentarios no disponibles temporalmente' });
    return;
  }

  const id = routeParam(req.params.id);
  const collection = await loadCollectionForComments(reader, id);
  if (collection === 'missing') {
    res.status(503).json({ error: collectionsMigrationHint() });
    return;
  }
  if (collection === 'error') {
    res.status(400).json({ error: 'No se pudo cargar la colección' });
    return;
  }
  if (!collection || !canEngageCollectionComments(collection, req.userId)) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  if (req.userId && req.userId !== collection.user_id) {
    const block = await getBlockRelation(req.userId, collection.user_id);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Colección no encontrada' });
      return;
    }
  }

  try {
    const comments = await fetchCollectionCommentsWithAuthors(reader, collection.id);
    res.json({ comments });
  } catch (err) {
    if (isMissingCollectionCommentsTable(err)) {
      res.status(503).json({ error: collectionCommentsMigrationHint() });
      return;
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error al cargar comentarios' });
  }
});

/** POST /api/collections/:id/comments */
collectionsRouter.post('/:id/comments', requireAuth, commentLimiter, async (req: AuthRequest, res) => {
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

  const moderationError = validateCommentBody(parsed.data.body);
  if (moderationError) {
    res.status(400).json({ error: moderationError });
    return;
  }

  const id = routeParam(req.params.id);
  const supabase = createUserClient(token);
  const collection = await loadCollectionForComments(supabase, id);
  if (collection === 'missing') {
    res.status(503).json({ error: collectionsMigrationHint() });
    return;
  }
  if (collection === 'error') {
    res.status(400).json({ error: 'No se pudo cargar la colección' });
    return;
  }
  if (!collection || !canEngageCollectionComments(collection, req.userId)) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  if (req.userId !== collection.user_id) {
    const block = await getBlockRelation(req.userId!, collection.user_id);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Colección no encontrada' });
      return;
    }
  }

  const { data, error } = await supabase
    .from('collection_comments')
    .insert({
      collection_id: collection.id,
      user_id: req.userId!,
      body: parsed.data.body,
    })
    .select('id, collection_id, user_id, body, created_at, edited_at')
    .single();

  if (error) {
    if (isMissingCollectionCommentsTable(error)) {
      res.status(503).json({ error: collectionCommentsMigrationHint() });
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
    edited_at: data.edited_at ?? null,
    author: profile
      ? {
          username: profile.username,
          display_name: profile.full_name ?? null,
          avatar_url: profile.avatar_url,
        }
      : null,
  });
});

/** PATCH /api/collections/:id/comments/:commentId */
collectionsRouter.patch(
  '/:id/comments/:commentId',
  requireAuth,
  commentLimiter,
  async (req: AuthRequest, res) => {
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

    const moderationError = validateCommentBody(parsed.data.body);
    if (moderationError) {
      res.status(400).json({ error: moderationError });
      return;
    }

    const collectionId = routeParam(req.params.id);
    const commentId = routeParam(req.params.commentId);
    const supabase = createUserClient(token);

    const { data: existing, error: existingError } = await supabase
      .from('collection_comments')
      .select('id, user_id, collection_id')
      .eq('id', commentId)
      .eq('collection_id', collectionId)
      .maybeSingle();

    if (existingError) {
      if (isMissingCollectionCommentsTable(existingError)) {
        res.status(503).json({ error: collectionCommentsMigrationHint() });
        return;
      }
      res.status(400).json({ error: existingError.message });
      return;
    }

    if (!existing) {
      res.status(404).json({ error: 'Comentario no encontrado' });
      return;
    }

    if (existing.user_id !== req.userId) {
      res.status(403).json({ error: 'Solo puedes editar tus comentarios' });
      return;
    }

    const editedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('collection_comments')
      .update({ body: parsed.data.body, edited_at: editedAt })
      .eq('id', commentId)
      .eq('collection_id', collectionId)
      .eq('user_id', req.userId!)
      .select('id, collection_id, user_id, body, created_at, edited_at')
      .maybeSingle();

    if (error) {
      if (isMissingCollectionCommentsTable(error)) {
        res.status(503).json({ error: collectionCommentsMigrationHint() });
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Comentario no encontrado' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url')
      .eq('id', req.userId!)
      .maybeSingle();

    res.json({
      ...data,
      edited_at: data.edited_at ?? editedAt,
      author: profile
        ? {
            username: profile.username,
            display_name: profile.full_name ?? null,
            avatar_url: profile.avatar_url,
          }
        : null,
    });
  },
);

/** DELETE /api/collections/:id/comments/:commentId */
collectionsRouter.delete('/:id/comments/:commentId', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const collectionId = routeParam(req.params.id);
  const commentId = routeParam(req.params.commentId);
  const supabase = createUserClient(token);

  const { data: comment, error: commentError } = await supabase
    .from('collection_comments')
    .select('id, user_id, collection_id')
    .eq('id', commentId)
    .eq('collection_id', collectionId)
    .maybeSingle();

  if (commentError) {
    if (isMissingCollectionCommentsTable(commentError)) {
      res.status(503).json({ error: collectionCommentsMigrationHint() });
      return;
    }
    res.status(400).json({ error: commentError.message });
    return;
  }

  if (!comment) {
    res.status(404).json({ error: 'Comentario no encontrado' });
    return;
  }

  const collection = await loadCollectionForComments(supabase, collectionId);
  if (collection === 'missing') {
    res.status(503).json({ error: collectionsMigrationHint() });
    return;
  }
  if (collection === 'error' || !collection) {
    res.status(404).json({ error: 'Colección no encontrada' });
    return;
  }

  const isAuthor = comment.user_id === req.userId;
  const isOwner = collection.user_id === req.userId;
  if (!isAuthor && !isOwner) {
    res.status(403).json({ error: 'No puedes borrar este comentario' });
    return;
  }

  const { error, count } = await supabase
    .from('collection_comments')
    .delete({ count: 'exact' })
    .eq('id', commentId)
    .eq('collection_id', collectionId);

  if (error) {
    if (isMissingCollectionCommentsTable(error)) {
      res.status(503).json({ error: collectionCommentsMigrationHint() });
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

  if (parsed.data.cover_capsule_id !== undefined) {
    if (parsed.data.cover_capsule_id === null) {
      patch.cover_capsule_id = null;
    } else {
      const { data: membership, error: membershipError } = await supabase
        .from('collection_items')
        .select('capsule_id')
        .eq('collection_id', id)
        .eq('capsule_id', parsed.data.cover_capsule_id)
        .maybeSingle();

      if (membershipError) {
        if (isMissingCollectionsTable(membershipError)) {
          res.status(503).json({ error: collectionsMigrationHint() });
          return;
        }
        res.status(400).json({ error: membershipError.message });
        return;
      }

      if (!membership) {
        res.status(400).json({ error: 'La Capsule de portada debe pertenecer a la colección' });
        return;
      }

      patch.cover_capsule_id = parsed.data.cover_capsule_id;
    }
  }

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
    if (isMissingCoverColumn(error)) {
      res.status(503).json({ error: coverMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  // Si pasa a privada, quitar pin del perfil (si estaba destacada).
  if (parsed.data.is_public === false && supabaseAdmin) {
    await supabaseAdmin
      .from('profiles')
      .update({ featured_collection_id: null })
      .eq('id', req.userId!)
      .eq('featured_collection_id', id);
  }

  const row = data as CollectionRow;
  const counts = await loadItemCounts(supabase, [id]);
  const coverUrls = await loadCoverUrls(supabase, [row]);
  res.json({
    collection: serializeCollection(row, {
      items_count: counts.get(id) ?? 0,
      cover_url: coverUrls.get(id) ?? null,
    }),
  });
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
    .select('id, cover_capsule_id')
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

  const clearCover = collection.cover_capsule_id === capsuleId;
  const { error: touchError } = await supabase
    .from('collections')
    .update({
      updated_at: new Date().toISOString(),
      ...(clearCover ? { cover_capsule_id: null } : {}),
    })
    .eq('id', id)
    .eq('user_id', req.userId!);

  if (touchError && isMissingCoverColumn(touchError) && clearCover) {
    await supabase
      .from('collections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.userId!);
  }

  res.status(204).send();
});

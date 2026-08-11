import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { deleteCapsulePhotoByUrl, deleteCapsulePhotosByUrls, uploadCapsulePhotoBuffer } from '../lib/ensureStorage.js';
import {
  buildDiaryExportCsv,
  buildDiaryExportJson,
  toExportCapsule,
} from '../lib/diaryExport.js';
import {
  buildImportSummary,
  formatDiaryImportSummary,
  parseDiaryImportPayload,
} from '../lib/diaryImport.js';
import { validateCommentBody, validateImageBuffer } from '../lib/contentModeration.js';
import { attachCommentCounts, fetchCommentsWithAuthors, isMissingCommentsTable } from '../lib/capsuleComments.js';
import { attachLikeStats, fetchLikesWithProfiles, isMissingLikesTable } from '../lib/capsuleLikes.js';
import { applyFeedContentFilters, resolveFeedContentFilters } from '../lib/feedFilters.js';
import { attachFollowStats, getFollowingIds } from '../lib/userFollows.js';
import { notifyUser } from '../lib/notifyUser.js';
import { normalizeProfile } from '../lib/profileNormalize.js';
import { computePublicProfileStats } from '../lib/publicProfileStats.js';
import { createUserClient, supabaseAdmin, supabaseAnon } from '../lib/supabase.js';
import { normalizeUsernameParam } from '../lib/usernameParam.js';
import { optionalAuth, requireAuth, type AuthRequest } from '../middleware/auth.js';

export const capsulesRouter = Router();

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 9 },
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
  photo_urls: z.array(z.string().url().max(2048)).max(9).optional(),
  is_public: z.boolean().optional().default(true),
  watch_context: z.enum(['stadium', 'tv', 'pub', 'other']).optional().nullable(),
});

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  /** following = tú + seguidos; explore = cápsulas públicas de cualquiera */
  scope: z.enum(['following', 'explore']).default('following'),
  sort: z.enum(['recent', 'popular']).default('recent'),
  /** Solo cápsulas con fotos (`photos=1`). */
  photos: z.string().optional(),
  /** Filtro ilike sobre competition_name. */
  competition: z.string().max(100).optional(),
});

/** Populares: ordenamos en servidor sobre un pool reciente (sin columna denormalizada). */
const FEED_POPULAR_POOL = 300;

function engagementScore(row: { likes_count?: number; comments_count?: number }): number {
  return (row.likes_count ?? 0) + (row.comments_count ?? 0);
}

const meQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  rating_min: z.coerce.number().int().min(1).max(5).optional(),
  visibility: z.enum(['all', 'public', 'private']).optional().default('all'),
  watch_context: z.enum(['stadium', 'tv', 'pub', 'other']).optional(),
});

const publicProfileQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  rating_min: z.coerce.number().int().min(1).max(5).optional(),
  watch_context: z.enum(['stadium', 'tv', 'pub', 'other']).optional(),
});

function sanitizeSearchQ(raw: string | undefined): string {
  return (raw?.toLowerCase() ?? '').replace(/[%_,.()"]/g, '').trim();
}

function listYearsFromWatchedAt(rows: { watched_at: string }[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    const year = Number(String(row.watched_at).slice(0, 4));
    if (Number.isInteger(year) && year >= 1990 && year <= 2100) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

function getAccessToken(req: AuthRequest): string | null {
  return req.headers.authorization?.replace('Bearer ', '') ?? null;
}

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function getReaderClient(token: string | null) {
  if (token) return createUserClient(token);
  if (supabaseAdmin) return supabaseAdmin;
  return null;
}

function isMissingPrivacyColumn(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('is_public') &&
    (message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist'))
  );
}

function isMissingWatchContextColumn(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('watch_context') &&
    (message.includes('schema cache') ||
      message.includes('Could not find') ||
      message.includes('column') ||
      message.includes('does not exist'))
  );
}

function privacyMigrationHint() {
  return 'Ejecuta la migración 20250730140000_capsule_privacy.sql en Supabase.';
}

function watchContextMigrationHint() {
  return 'Ejecuta la migración 20250730160000_watch_context.sql en Supabase.';
}

function canViewCapsule(
  capsule: { user_id: string; is_public?: boolean | null },
  viewerId: string | undefined,
): boolean {
  if (capsule.is_public !== false) return true;
  return !!viewerId && viewerId === capsule.user_id;
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

  const { limit, offset, scope, sort, photos, competition } = parsed.data;
  const contentFilters = resolveFeedContentFilters({ photos, competition });
  const supabase = createUserClient(token);
  const userId = req.userId!;
  const followingIds = await getFollowingIds(supabase, userId);

  /** Aplica Siguiendo (tú+seguidos) o Explorar (públicas) + filtros de contenido. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFeedScope = (query: any) => {
    if (scope === 'explore') {
      return applyFeedContentFilters(query.eq('is_public', true), contentFilters);
    }
    let scoped = query.or(`is_public.eq.true,user_id.eq.${userId}`);
    if (followingIds !== null) {
      const feedUserIds = [...new Set([userId, ...followingIds])];
      scoped = scoped.in('user_id', feedUserIds);
    }
    return applyFeedContentFilters(scoped, contentFilters);
  };

  let rows: Array<{ id: string; user_id: string; created_at: string }> = [];
  let total = 0;

  if (sort === 'popular') {
    const { data: candidates, error: poolError } = await applyFeedScope(
      supabase.from('capsules').select('id, created_at').order('created_at', { ascending: false }),
    ).range(0, FEED_POPULAR_POOL - 1);

    if (poolError) {
      if (isMissingPrivacyColumn(poolError)) {
        res.status(503).json({ error: privacyMigrationHint() });
        return;
      }
      res.status(400).json({ error: poolError.message });
      return;
    }

    const pool = (candidates ?? []) as Array<{ id: string; created_at: string }>;
    const withLikes = await attachLikeStats(supabase, userId, pool);
    const withEngagement = await attachCommentCounts(supabase, withLikes);
    const ranked = [...withEngagement].sort((a, b) => {
      const scoreDiff = engagementScore(b) - engagementScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return b.created_at.localeCompare(a.created_at);
    });

    total = ranked.length;
    const pageIds = ranked.slice(offset, offset + limit).map((row) => row.id);

    if (pageIds.length > 0) {
      const { data: fullRows, error: fullError } = await supabase
        .from('capsules')
        .select('*')
        .in('id', pageIds);

      if (fullError) {
        res.status(400).json({ error: fullError.message });
        return;
      }

      const byId = new Map((fullRows ?? []).map((row) => [row.id as string, row]));
      rows = pageIds.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
    }
  } else {
    const { data: capsules, error, count } = await applyFeedScope(
      supabase
        .from('capsules')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false }),
    ).range(offset, offset + limit - 1);

    if (error) {
      if (isMissingPrivacyColumn(error)) {
        res.status(503).json({ error: privacyMigrationHint() });
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }

    rows = (capsules ?? []) as typeof rows;
    total = count ?? 0;
  }

  const userIds = [...new Set(rows.map((c) => c.user_id))];
  const profileMap = new Map<
    string,
    { username: string | null; display_name: string | null; avatar_url: string | null }
  >();

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

  const withLikes = await attachLikeStats(supabase, userId, rows);
  const feedRows = await attachCommentCounts(supabase, withLikes);

  res.json({
    capsules: feedRows.map((capsule) => ({
      ...capsule,
      profiles: profileMap.get(capsule.user_id) ?? null,
    })),
    total,
    following_count: followingIds?.length ?? undefined,
    scope,
    sort,
    photos: contentFilters.photosOnly,
    competition: contentFilters.competition || null,
  });
});

capsulesRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = meQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { limit, offset, year, rating_min, visibility, watch_context } = parsed.data;
  const safeQ = sanitizeSearchQ(parsed.data.q);

  const supabase = createUserClient(token);
  let query = supabase
    .from('capsules')
    .select('*', { count: 'exact' })
    .eq('user_id', req.userId!)
    .order('watched_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (year != null) {
    query = query.gte('watched_at', `${year}-01-01`).lte('watched_at', `${year}-12-31`);
  }

  if (rating_min != null) {
    query = query.gte('rating', rating_min);
  }

  if (visibility === 'public') {
    query = query.eq('is_public', true);
  } else if (visibility === 'private') {
    query = query.eq('is_public', false);
  }

  if (watch_context) {
    query = query.eq('watch_context', watch_context);
  }

  if (safeQ.length >= 2) {
    const pattern = `%${safeQ}%`;
    query = query.or(
      `home_team_name.ilike."${pattern}",away_team_name.ilike."${pattern}",competition_name.ilike."${pattern}",note.ilike."${pattern}"`,
    );
  }

  if (limit != null) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    if (visibility !== 'all' && isMissingPrivacyColumn(error)) {
      res.status(503).json({ error: privacyMigrationHint() });
      return;
    }
    if (watch_context && isMissingWatchContextColumn(error)) {
      res.status(503).json({ error: watchContextMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ capsules: data ?? [], total: count ?? data?.length ?? 0 });
});

const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

/** GET /api/capsules/me/export — backup GDPR (solo datos del usuario autenticado). */
capsulesRouter.get('/me/export', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = exportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Formato inválido. Usa json o csv.' });
    return;
  }

  const supabase = createUserClient(token);

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('id', req.userId!)
    .maybeSingle();

  const { data, error } = await supabase
    .from('capsules')
    .select(
      'id, match_id, match_played_at, home_team_name, away_team_name, home_team_crest, away_team_crest, competition_name, home_score, away_score, watched_at, rating, note, photo_urls, is_public, watch_context, created_at, updated_at',
    )
    .eq('user_id', req.userId!)
    .order('watched_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const capsules = (data ?? []).map((row) => toExportCapsule(row as Record<string, unknown>));
  const stamp = new Date().toISOString().slice(0, 10);
  const username = (profile?.username as string | null) ?? 'ninety';

  if (parsed.data.format === 'csv') {
    const body = buildDiaryExportCsv(capsules);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ninety-diario-${username}-${stamp}.csv"`,
    );
    res.send(body);
    return;
  }

  const payload = {
    exported_at: new Date().toISOString(),
    format_version: 1 as const,
    profile: {
      username: (profile?.username as string | null) ?? null,
      display_name: (profile?.full_name as string | null) ?? null,
    },
    capsules,
  };

  const body = buildDiaryExportJson(payload);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ninety-diario-${username}-${stamp}.json"`,
  );
  res.send(body);
});

/** POST /api/capsules/me/import — restaura Capsules desde export JSON (GDPR). */
capsulesRouter.post('/me/import', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = parseDiaryImportPayload(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const totalInFile =
    parsed.rows.length + parsed.skipped_invalid + parsed.skipped_duplicate_in_file;

  if (parsed.rows.length === 0) {
    const empty = buildImportSummary({
      imported: 0,
      skipped_duplicate: 0,
      skipped_invalid: parsed.skipped_invalid,
      skipped_duplicate_in_file: parsed.skipped_duplicate_in_file,
      total_in_file: totalInFile,
    });
    res.json({ ...empty, message: formatDiaryImportSummary(empty) });
    return;
  }

  const supabase = createUserClient(token);
  const matchIds = parsed.rows.map((c) => c.match_id);

  const { data: existingRows, error: existingError } = await supabase
    .from('capsules')
    .select('match_id')
    .eq('user_id', req.userId!)
    .in('match_id', matchIds);

  if (existingError) {
    res.status(400).json({ error: existingError.message });
    return;
  }

  const existing = new Set((existingRows ?? []).map((row) => Number(row.match_id)));
  const toInsert = parsed.rows.filter((c) => !existing.has(c.match_id));
  let skippedDuplicate = parsed.rows.length - toInsert.length;

  let imported = 0;
  if (toInsert.length > 0) {
    const rows = toInsert.map((capsule) => ({
      user_id: req.userId!,
      match_id: capsule.match_id,
      match_played_at: capsule.match_played_at,
      home_team_name: capsule.home_team_name,
      away_team_name: capsule.away_team_name,
      home_team_crest: capsule.home_team_crest,
      away_team_crest: capsule.away_team_crest,
      competition_name: capsule.competition_name,
      home_score: capsule.home_score,
      away_score: capsule.away_score,
      watched_at: capsule.watched_at,
      rating: capsule.rating,
      note: capsule.note,
      photo_urls: capsule.photo_urls,
      is_public: capsule.is_public,
      watch_context: capsule.watch_context,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('capsules')
      .insert(rows)
      .select('id');

    if (insertError) {
      if (insertError.code === '23505') {
        for (const row of rows) {
          const { error: oneError } = await supabase.from('capsules').insert(row).select('id').single();
          if (!oneError) {
            imported += 1;
          } else if (oneError.code !== '23505') {
            if (isMissingPrivacyColumn(oneError)) {
              res.status(503).json({ error: privacyMigrationHint() });
              return;
            }
            if (isMissingWatchContextColumn(oneError)) {
              res.status(503).json({ error: watchContextMigrationHint() });
              return;
            }
            res.status(400).json({ error: oneError.message });
            return;
          } else {
            skippedDuplicate += 1;
          }
        }
      } else if (isMissingPrivacyColumn(insertError)) {
        res.status(503).json({ error: privacyMigrationHint() });
        return;
      } else if (isMissingWatchContextColumn(insertError)) {
        res.status(503).json({ error: watchContextMigrationHint() });
        return;
      } else {
        res.status(400).json({ error: insertError.message });
        return;
      }
    } else {
      imported = inserted?.length ?? toInsert.length;
    }
  }

  const summary = buildImportSummary({
    imported,
    skipped_duplicate: skippedDuplicate,
    skipped_invalid: parsed.skipped_invalid,
    skipped_duplicate_in_file: parsed.skipped_duplicate_in_file,
    total_in_file: totalInFile,
  });

  res.json({ ...summary, message: formatDiaryImportSummary(summary) });
});

capsulesRouter.get('/user/:username', optionalAuth, async (req: AuthRequest, res) => {
  const username = normalizeUsernameParam(req.params.username);
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Perfil público no disponible temporalmente' });
    return;
  }

  if (!username) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const { data: profile, error: profileError } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url, favorite_team, country, city, bio, created_at')
    .eq('username', username)
    .single();

  if (profileError || !profile) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const parsed = publicProfileQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { limit, offset, year, rating_min, watch_context } = parsed.data;
  const safeQ = sanitizeSearchQ(parsed.data.q);

  let query = reader
    .from('capsules')
    .select('*', { count: 'exact' })
    .eq('user_id', profile.id)
    .order('watched_at', { ascending: false })
    .order('created_at', { ascending: false });

  const viewerId = req.userId ?? '';
  if (viewerId !== profile.id) {
    query = query.eq('is_public', true);
  }

  if (year != null) {
    query = query.gte('watched_at', `${year}-01-01`).lte('watched_at', `${year}-12-31`);
  }

  if (rating_min != null) {
    query = query.gte('rating', rating_min);
  }

  if (watch_context) {
    query = query.eq('watch_context', watch_context);
  }

  if (safeQ.length >= 2) {
    const pattern = `%${safeQ}%`;
    query = query.or(
      `home_team_name.ilike."${pattern}",away_team_name.ilike."${pattern}",competition_name.ilike."${pattern}",note.ilike."${pattern}"`,
    );
  }

  if (limit != null) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    if (isMissingPrivacyColumn(error)) {
      res.status(503).json({ error: privacyMigrationHint() });
      return;
    }
    if (watch_context && isMissingWatchContextColumn(error)) {
      res.status(503).json({ error: watchContextMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  let stats = null;
  let years: number[] | null = null;
  if (offset === 0) {
    let statsQuery = reader
      .from('capsules')
      .select('watched_at, rating, home_team_name, away_team_name, competition_name, watch_context, photo_urls, photo_url')
      .eq('user_id', profile.id);

    if (viewerId !== profile.id) {
      statsQuery = statsQuery.eq('is_public', true);
    }

    const { data: statsRows, error: statsError } = await statsQuery;
    if (!statsError) {
      const rows = statsRows ?? [];
      stats = computePublicProfileStats(rows);
      years = listYearsFromWatchedAt(rows);
    }
  }

  const withLikes = await attachLikeStats(reader, viewerId, data ?? []);
  const capsulesWithLikes = await attachCommentCounts(reader, withLikes);
  const normalizedProfile = normalizeProfile(profile);
  const profileWithFollows = await attachFollowStats(reader, viewerId, normalizedProfile);

  res.json({
    profile: profileWithFollows,
    capsules: capsulesWithLikes,
    total: count ?? capsulesWithLikes.length,
    ...(stats ? { stats } : {}),
    ...(years ? { years } : {}),
  });
});

capsulesRouter.post('/photos', requireAuth, photoUpload.array('photos', 9), async (req: AuthRequest, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) {
    res.status(400).json({ error: 'No se recibió ninguna foto.' });
    return;
  }

  for (const file of files) {
    const imageError = validateImageBuffer(file.buffer, file.mimetype);
    if (imageError) {
      res.status(400).json({ error: imageError });
      return;
    }
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
  photo_urls: z.array(z.string().url().max(2048)).max(9).optional(),
  is_public: z.boolean().optional(),
  watch_context: z.enum(['stadium', 'tv', 'pub', 'other']).optional().nullable(),
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
    .select('id, user_id')
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

  notifyUser({ userId: capsule.user_id, actorId: req.userId!, type: 'like', capsuleId: capsule.id });
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

const likesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

capsulesRouter.get('/:id/likes', optionalAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Likes no disponibles temporalmente' });
    return;
  }

  const parsed = likesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const capsuleId = routeParam(req.params.id);
  const { data: capsule, error: capsuleError } = await reader
    .from('capsules')
    .select('id, user_id, is_public')
    .eq('id', capsuleId)
    .maybeSingle();

  if (capsuleError) {
    res.status(400).json({ error: capsuleError.message });
    return;
  }

  if (!capsule || !canViewCapsule(capsule, req.userId)) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  try {
    const page = await fetchLikesWithProfiles(reader, capsuleId, {
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      viewerId: req.userId,
    });
    res.json(page);
  } catch (err) {
    if (isMissingLikesTable(err)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250711200000_capsule_likes.sql en Supabase.',
      });
      return;
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error al cargar likes' });
  }
});

const commentBodySchema = z.object({
  body: z.string().trim().min(1, 'Escribe un comentario').max(500),
});

capsulesRouter.get('/:id/comments', optionalAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Comentarios no disponibles temporalmente' });
    return;
  }

  const capsuleId = routeParam(req.params.id);
  const { data: capsule, error: capsuleError } = await reader
    .from('capsules')
    .select('id, user_id, is_public')
    .eq('id', capsuleId)
    .maybeSingle();

  if (capsuleError) {
    res.status(400).json({ error: capsuleError.message });
    return;
  }

  if (!capsule || !canViewCapsule(capsule, req.userId)) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  try {
    const comments = await fetchCommentsWithAuthors(reader, capsuleId);
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

  const moderationError = validateCommentBody(parsed.data.body);
  if (moderationError) {
    res.status(400).json({ error: moderationError });
    return;
  }

  const supabase = createUserClient(token);
  const { data: capsule, error: capsuleError } = await supabase
    .from('capsules')
    .select('id, user_id')
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

  notifyUser({
    userId: capsule.user_id,
    actorId: req.userId!,
    type: 'comment',
    capsuleId: capsule.id,
    body: parsed.data.body,
  });

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

capsulesRouter.patch('/:id/comments/:commentId', requireAuth, async (req: AuthRequest, res) => {
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

  const capsuleId = routeParam(req.params.id);
  const commentId = routeParam(req.params.commentId);
  const supabase = createUserClient(token);

  const { data: existing, error: existingError } = await supabase
    .from('capsule_comments')
    .select('id, user_id, capsule_id')
    .eq('id', commentId)
    .eq('capsule_id', capsuleId)
    .maybeSingle();

  if (existingError) {
    if (isMissingCommentsTable(existingError)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250711210000_capsule_comments.sql en Supabase.',
      });
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

  const { data, error } = await supabase
    .from('capsule_comments')
    .update({ body: parsed.data.body })
    .eq('id', commentId)
    .eq('capsule_id', capsuleId)
    .eq('user_id', req.userId!)
    .select('id, capsule_id, user_id, body, created_at')
    .maybeSingle();

  if (error) {
    if (isMissingCommentsTable(error)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250801120000_capsule_comments_update.sql en Supabase.',
      });
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

  const capsuleId = routeParam(req.params.id);
  const commentId = routeParam(req.params.commentId);
  const supabase = createUserClient(token);

  const { data: comment, error: commentError } = await supabase
    .from('capsule_comments')
    .select('id, user_id, capsule_id')
    .eq('id', commentId)
    .eq('capsule_id', capsuleId)
    .maybeSingle();

  if (commentError) {
    if (isMissingCommentsTable(commentError)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250711210000_capsule_comments.sql en Supabase.',
      });
      return;
    }
    res.status(400).json({ error: commentError.message });
    return;
  }

  if (!comment) {
    res.status(404).json({ error: 'Comentario no encontrado' });
    return;
  }

  const { data: capsule, error: capsuleError } = await supabase
    .from('capsules')
    .select('id, user_id')
    .eq('id', capsuleId)
    .maybeSingle();

  if (capsuleError) {
    res.status(400).json({ error: capsuleError.message });
    return;
  }

  if (!capsule) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  const isAuthor = comment.user_id === req.userId;
  const isCapsuleOwner = capsule.user_id === req.userId;
  if (!isAuthor && !isCapsuleOwner) {
    res.status(403).json({ error: 'No puedes borrar este comentario' });
    return;
  }

  const { error, count } = await supabase
    .from('capsule_comments')
    .delete({ count: 'exact' })
    .eq('id', commentId)
    .eq('capsule_id', capsuleId);

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

capsulesRouter.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Capsule pública no disponible temporalmente' });
    return;
  }

  const capsuleId = routeParam(req.params.id);
  const { data, error } = await reader.from('capsules').select('*').eq('id', capsuleId).maybeSingle();

  if (error) {
    if (isMissingPrivacyColumn(error)) {
      res.status(503).json({ error: privacyMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  if (!data) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  const viewerId = req.userId ?? '';
  if (!canViewCapsule(data, viewerId || undefined)) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  const [withLikes] = await attachLikeStats(reader, viewerId, [data]);
  const [withComments] = await attachCommentCounts(reader, [withLikes]);

  const { data: profile } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', data.user_id)
    .maybeSingle();

  let followed_by_me = false;
  if (viewerId && profile && viewerId !== profile.id) {
    const { data: followRow, error: followError } = await reader
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', viewerId)
      .eq('following_id', profile.id)
      .maybeSingle();

    if (!followError) {
      followed_by_me = !!followRow;
    }
  }

  res.json({
    ...withComments,
    profiles: profile
      ? {
          username: profile.username,
          display_name: profile.full_name ?? null,
          avatar_url: profile.avatar_url,
          followed_by_me,
        }
      : null,
  });
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
      is_public: parsed.data.is_public ?? true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('capsules')
        .select('id')
        .eq('user_id', req.userId!)
        .eq('match_id', parsed.data.match_id)
        .maybeSingle();

      res.status(409).json({
        error: 'Ya guardaste este partido en tu diario',
        ...(existing?.id ? { capsule_id: existing.id } : {}),
      });
      return;
    }
    if (isMissingPrivacyColumn(error)) {
      res.status(503).json({ error: privacyMigrationHint() });
      return;
    }
    if (isMissingWatchContextColumn(error)) {
      res.status(503).json({ error: watchContextMigrationHint() });
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

  if (error) {
    if (isMissingPrivacyColumn(error)) {
      res.status(503).json({ error: privacyMigrationHint() });
      return;
    }
    if (isMissingWatchContextColumn(error)) {
      res.status(503).json({ error: watchContextMigrationHint() });
      return;
    }
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  if (!data) {
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

  const capsuleId = routeParam(req.params.id);
  const supabase = createUserClient(token);

  const { data: capsule, error: fetchError } = await supabase
    .from('capsules')
    .select('id, photo_urls')
    .eq('id', capsuleId)
    .eq('user_id', req.userId!)
    .maybeSingle();

  if (fetchError) {
    res.status(400).json({ error: fetchError.message });
    return;
  }

  if (!capsule) {
    res.status(404).json({ error: 'Capsule no encontrada' });
    return;
  }

  const { error } = await supabase
    .from('capsules')
    .delete()
    .eq('id', capsuleId)
    .eq('user_id', req.userId!);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const photoUrls = Array.isArray(capsule.photo_urls)
    ? capsule.photo_urls.filter((url): url is string => typeof url === 'string')
    : [];

  try {
    await deleteCapsulePhotosByUrls(photoUrls, req.userId!);
  } catch (err) {
    console.warn(
      'No se pudieron limpiar fotos tras borrar Capsule:',
      err instanceof Error ? err.message : err,
    );
  }

  res.status(204).end();
});

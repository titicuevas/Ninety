import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { CAPSULE_NOTE_MAX, normalizeCapsuleNote } from '../lib/capsuleNote.js';
import {
  CAPSULE_TAGS_MAX,
  CAPSULE_TAG_MAX_LEN,
  normalizeCapsuleTags,
  parseCapsuleTagFilter,
} from '../lib/capsuleTags.js';
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
import { restorePhotosForCapsules } from '../lib/diaryImportPhotos.js';
import { validateCommentBody, validateImageBuffer } from '../lib/contentModeration.js';
import {
  assertValidReplyParent,
  attachCommentCounts,
  fetchCommentsWithAuthors,
  isMissingCommentsTable,
  isMissingEditedAtColumn,
  isMissingParentIdColumn,
} from '../lib/capsuleComments.js';
import { notifyCommentMentions } from '../lib/commentMentions.js';
import { attachLikeStats, fetchLikesWithProfiles, isMissingLikesTable } from '../lib/capsuleLikes.js';
import { applyFeedContentFilters, resolveFeedContentFilters } from '../lib/feedFilters.js';
import { attachFollowStats, getFollowingIds } from '../lib/userFollows.js';
import { attachMutedByMe } from '../lib/notificationMutes.js';
import {
  attachBlockedByMe,
  excludeBlockedIds,
  getBlockRelation,
  isBlockActive,
  listBlockedEitherWayIds,
} from '../lib/userBlocks.js';
import { notifyUser } from '../lib/notifyUser.js';
import { loadFeaturedCollectionSummary } from '../lib/featuredCollection.js';
import { normalizeProfile } from '../lib/profileNormalize.js';
import {
  fetchProfileByUsername,
  profilesAlignMigrationHint,
} from '../lib/profileLookup.js';
import { computePublicProfileStats, type PublicProfileStatsRow } from '../lib/publicProfileStats.js';
import {
  buildCalendarDayCounts,
  resolveCalendarMonth,
} from '../lib/diaryCalendar.js';
import { createUserClient, supabaseAdmin, supabaseAnon } from '../lib/supabase.js';
import { clearWantToGoAfterCapsule } from '../lib/wantToGo.js';
import { optionalAuth, requireAuth, type AuthRequest } from '../middleware/auth.js';

export const capsulesRouter = Router();

const commentLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados comentarios. Inténtalo en un minuto.' },
});

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
  /** Positivo = football-data; negativo = partido manual. */
  match_id: z.number().int().refine((n) => n !== 0, 'match_id no puede ser 0'),
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
  note: z.string().max(CAPSULE_NOTE_MAX).optional().nullable(),
  tags: z.array(z.string().max(CAPSULE_TAG_MAX_LEN)).max(CAPSULE_TAGS_MAX).optional(),
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
  /** Una etiqueta exacta (normalizada) para filtrar Mis Capsules. */
  tag: z.string().trim().max(CAPSULE_TAG_MAX_LEN).optional(),
});

const publicProfileQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().trim().max(100).optional(),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  rating_min: z.coerce.number().int().min(1).max(5).optional(),
  watch_context: z.enum(['stadium', 'tv', 'pub', 'other']).optional(),
  /** Una etiqueta exacta (normalizada) para filtrar el diario público. */
  tag: z.string().trim().max(CAPSULE_TAG_MAX_LEN).optional(),
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

function isMissingTagsColumn(error: { message?: string } | null | undefined): boolean {
  const message = error?.message ?? '';
  return (
    message.includes('tags') &&
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

function tagsMigrationHint() {
  return 'Ejecuta la migración 20250820120000_capsule_tags.sql en Supabase.';
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
  const [followingIds, blockedIdsList] = await Promise.all([
    getFollowingIds(supabase, userId),
    listBlockedEitherWayIds(userId),
  ]);
  const blockedIds = new Set(blockedIdsList);

  /** Aplica Siguiendo (tú+seguidos) o Explorar (públicas) + filtros de contenido. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFeedScope = (query: any) => {
    if (scope === 'explore') {
      let scoped = applyFeedContentFilters(query.eq('is_public', true), contentFilters);
      if (blockedIds.size > 0) {
        scoped = scoped.not('user_id', 'in', `(${[...blockedIds].join(',')})`);
      }
      return scoped;
    }
    let scoped = query.or(`is_public.eq.true,user_id.eq.${userId}`);
    if (followingIds !== null) {
      const feedUserIds = excludeBlockedIds(
        [...new Set([userId, ...followingIds])],
        blockedIds,
      );
      scoped = scoped.in('user_id', feedUserIds);
    } else if (blockedIds.size > 0) {
      scoped = scoped.not('user_id', 'in', `(${[...blockedIds].join(',')})`);
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
  const tagFilter = parseCapsuleTagFilter(parsed.data.tag);

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

  if (tagFilter) {
    query = query.contains('tags', [tagFilter]);
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
    if (tagFilter && isMissingTagsColumn(error)) {
      res.status(503).json({ error: tagsMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ capsules: data ?? [], total: count ?? data?.length ?? 0 });
});

const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(1990).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/** GET /api/capsules/me/calendar — Capsules del mes por watched_at (vista diario). */
capsulesRouter.get('/me/calendar', requireAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = calendarQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Parámetros year y month requeridos (mes 1–12).' });
    return;
  }

  const range = resolveCalendarMonth(parsed.data.year, parsed.data.month);
  if (!range) {
    res.status(400).json({ error: 'Mes inválido.' });
    return;
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase
    .from('capsules')
    .select('*')
    .eq('user_id', req.userId!)
    .gte('watched_at', range.from)
    .lte('watched_at', range.to)
    .order('watched_at', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const capsules = data ?? [];
  const publicTotal = capsules.filter((c) => c.is_public !== false).length;
  res.json({
    year: range.year,
    month: range.month,
    from: range.from,
    to: range.to,
    days: buildCalendarDayCounts(capsules),
    capsules,
    total: capsules.length,
    public_total: publicTotal,
  });
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
      'id, match_id, match_played_at, home_team_name, away_team_name, home_team_crest, away_team_crest, competition_name, home_score, away_score, watched_at, rating, note, tags, photo_urls, is_public, watch_context, created_at, updated_at',
    )
    .eq('user_id', req.userId!)
    .order('watched_at', { ascending: false })
    .order('created_at', { ascending: false });

  let exportRows: Record<string, unknown>[] | null = (data ?? null) as Record<string, unknown>[] | null;
  let exportError = error;

  if (exportError && isMissingTagsColumn(exportError)) {
    const fallback = await supabase
      .from('capsules')
      .select(
        'id, match_id, match_played_at, home_team_name, away_team_name, home_team_crest, away_team_crest, competition_name, home_score, away_score, watched_at, rating, note, photo_urls, is_public, watch_context, created_at, updated_at',
      )
      .eq('user_id', req.userId!)
      .order('watched_at', { ascending: false })
      .order('created_at', { ascending: false });
    exportRows = (fallback.data ?? null) as Record<string, unknown>[] | null;
    exportError = fallback.error;
  }

  if (exportError) {
    res.status(400).json({ error: exportError.message });
    return;
  }

  const capsules = (exportRows ?? []).map((row) => toExportCapsule(row));
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
  const insertedForPhotos: { id: string; source_photo_urls: string[] }[] = [];

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
      tags: capsule.tags,
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
        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i]!;
          const { data: oneRow, error: oneError } = await supabase
            .from('capsules')
            .insert(row)
            .select('id')
            .single();
          if (!oneError && oneRow) {
            imported += 1;
            insertedForPhotos.push({
              id: oneRow.id as string,
              source_photo_urls: toInsert[i]?.source_photo_urls ?? [],
            });
          } else if (oneError && oneError.code !== '23505') {
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
          } else if (oneError?.code === '23505') {
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
      for (let i = 0; i < (inserted?.length ?? 0); i += 1) {
        const row = inserted![i];
        if (!row) continue;
        insertedForPhotos.push({
          id: row.id as string,
          source_photo_urls: toInsert[i]?.source_photo_urls ?? [],
        });
      }
    }
  }

  let photoSummary: {
    photos_restored: number;
    photos_failed: number;
    photos_skipped_limit: number;
    capsules_with_photos: number;
  } | null = null;

  if (parsed.restore_photos && insertedForPhotos.length > 0) {
    const candidates = insertedForPhotos.filter((c) => c.source_photo_urls.length > 0);
    if (candidates.length > 0) {
      const { byCapsuleId, summary } = await restorePhotosForCapsules(
        candidates.map((c) => ({ capsuleId: c.id, sourceUrls: c.source_photo_urls })),
        req.userId!,
      );

      for (const [capsuleId, urls] of byCapsuleId) {
        const { error: updateError } = await supabase
          .from('capsules')
          .update({ photo_urls: urls })
          .eq('id', capsuleId)
          .eq('user_id', req.userId!);

        if (updateError) {
          res.status(400).json({ error: updateError.message });
          return;
        }
      }

      photoSummary = summary;
    }
  }

  const summary = buildImportSummary({
    imported,
    skipped_duplicate: skippedDuplicate,
    skipped_invalid: parsed.skipped_invalid,
    skipped_duplicate_in_file: parsed.skipped_duplicate_in_file,
    total_in_file: totalInFile,
    ...(photoSummary ?? {}),
  });

  res.json({ ...summary, message: formatDiaryImportSummary(summary) });
});

/**
 * GET /api/capsules/user/:username/calendar — mes shareable del diario.
 * Solo Capsules públicas; 404 si el mes no tiene ninguna (privacidad).
 */
capsulesRouter.get('/user/:username/calendar', optionalAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Calendario público no disponible temporalmente' });
    return;
  }

  const parsed = calendarQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Parámetros year y month requeridos (mes 1–12).' });
    return;
  }

  const range = resolveCalendarMonth(parsed.data.year, parsed.data.month);
  if (!range) {
    res.status(400).json({ error: 'Mes inválido.' });
    return;
  }

  const profileResult = await fetchProfileByUsername(supabaseAnon, req.params.username);
  if (profileResult.error === 'schema') {
    res.status(503).json({ error: profileResult.message ?? profilesAlignMigrationHint() });
    return;
  }
  if (profileResult.error === 'query') {
    res.status(400).json({ error: profileResult.message ?? 'No se pudo cargar el perfil' });
    return;
  }
  if (profileResult.error === 'not_found' || !profileResult.profile) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const profile = profileResult.profile;
  const viewerId = req.userId ?? '';
  if (viewerId && viewerId !== profile.id) {
    const block = await getBlockRelation(viewerId, profile.id);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
  }

  const { data, error } = await reader
    .from('capsules')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .gte('watched_at', range.from)
    .lte('watched_at', range.to)
    .order('watched_at', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    if (isMissingPrivacyColumn(error)) {
      res.status(503).json({ error: privacyMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  const capsules = data ?? [];
  if (capsules.length === 0) {
    res.status(404).json({ error: 'Este mes no tiene Capsules públicas para compartir.' });
    return;
  }

  const withLikes = await attachLikeStats(reader, viewerId, capsules);
  const capsulesWithLikes = await attachCommentCounts(reader, withLikes);
  const normalizedProfile = normalizeProfile(profile);

  res.json({
    profile: normalizedProfile,
    year: range.year,
    month: range.month,
    from: range.from,
    to: range.to,
    days: buildCalendarDayCounts(capsules),
    capsules: capsulesWithLikes,
    total: capsules.length,
  });
});

capsulesRouter.get('/user/:username', optionalAuth, async (req: AuthRequest, res) => {
  const token = getAccessToken(req);
  const reader = getReaderClient(token);

  if (!reader) {
    res.status(503).json({ error: 'Perfil público no disponible temporalmente' });
    return;
  }

  const profileResult = await fetchProfileByUsername(supabaseAnon, req.params.username);
  if (profileResult.error === 'schema') {
    res.status(503).json({ error: profileResult.message ?? profilesAlignMigrationHint() });
    return;
  }
  if (profileResult.error === 'query') {
    res.status(400).json({ error: profileResult.message ?? 'No se pudo cargar el perfil' });
    return;
  }
  if (profileResult.error === 'not_found' || !profileResult.profile) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return;
  }

  const profile = profileResult.profile;

  const viewerId = req.userId ?? '';
  if (viewerId && viewerId !== profile.id) {
    const block = await getBlockRelation(viewerId, profile.id);
    if (block.blocked_me) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    if (block.blocked_by_me) {
      const normalizedProfile = normalizeProfile(profile);
      const profileWithFollows = await attachFollowStats(reader, viewerId, normalizedProfile);
      const profileWithMute = await attachMutedByMe(reader, viewerId, profileWithFollows);
      const profileWithBlock = await attachBlockedByMe(reader, viewerId, profileWithMute);
      res.json({
        profile: profileWithBlock,
        capsules: [],
        total: 0,
        blocked: true,
      });
      return;
    }
  }

  const parsed = publicProfileQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { limit, offset, year, rating_min, watch_context } = parsed.data;
  const safeQ = sanitizeSearchQ(parsed.data.q);
  const tagFilter = parseCapsuleTagFilter(parsed.data.tag);

  let query = reader
    .from('capsules')
    .select('*', { count: 'exact' })
    .eq('user_id', profile.id)
    .order('watched_at', { ascending: false })
    .order('created_at', { ascending: false });

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

  if (tagFilter) {
    query = query.contains('tags', [tagFilter]);
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
    if (tagFilter && isMissingTagsColumn(error)) {
      res.status(503).json({ error: tagsMigrationHint() });
      return;
    }
    res.status(400).json({ error: error.message });
    return;
  }

  let stats = null;
  let years: number[] | null = null;
  let tags: string[] | null = null;
  if (offset === 0) {
    // Solo `photo_urls`: `photo_url` se eliminó en 20250705160000_capsule_photo_urls.
    // Pedir la columna legacy hace fallar el select y el Wrapped público desaparece en silencio.
    const statsSelectWithTags =
      'watched_at, rating, home_team_name, away_team_name, competition_name, watch_context, photo_urls, tags';
    const statsSelectWithContext =
      'watched_at, rating, home_team_name, away_team_name, competition_name, watch_context, photo_urls';
    const statsSelectCore =
      'watched_at, rating, home_team_name, away_team_name, competition_name, photo_urls';

    let statsQuery = reader
      .from('capsules')
      .select(statsSelectWithTags)
      .eq('user_id', profile.id);

    if (viewerId !== profile.id) {
      statsQuery = statsQuery.eq('is_public', true);
    }

    let statsRows: Array<PublicProfileStatsRow & { tags?: string[] | null }> | null = null;
    const firstStats = await statsQuery;
    let statsError = firstStats.error;
    statsRows = (firstStats.data as Array<PublicProfileStatsRow & { tags?: string[] | null }> | null) ?? null;

    if (statsError && isMissingTagsColumn(statsError)) {
      let fallbackTags = reader
        .from('capsules')
        .select(statsSelectWithContext)
        .eq('user_id', profile.id);
      if (viewerId !== profile.id) {
        fallbackTags = fallbackTags.eq('is_public', true);
      }
      const secondStats = await fallbackTags;
      statsError = secondStats.error;
      statsRows = (secondStats.data as Array<PublicProfileStatsRow & { tags?: string[] | null }> | null) ?? null;
    }

    if (statsError && isMissingWatchContextColumn(statsError)) {
      let fallback = reader.from('capsules').select(statsSelectCore).eq('user_id', profile.id);
      if (viewerId !== profile.id) {
        fallback = fallback.eq('is_public', true);
      }
      const secondStats = await fallback;
      statsError = secondStats.error;
      statsRows = (secondStats.data as Array<PublicProfileStatsRow & { tags?: string[] | null }> | null) ?? null;
    }

    if (!statsError) {
      const rows = statsRows ?? [];
      stats = computePublicProfileStats(rows);
      years = listYearsFromWatchedAt(rows);
      const tagSet = new Set<string>();
      for (const row of rows) {
        for (const raw of row.tags ?? []) {
          const tag = parseCapsuleTagFilter(raw);
          if (tag) tagSet.add(tag);
        }
      }
      tags = [...tagSet].sort((a, b) => a.localeCompare(b, 'es'));
    }
  }

  const withLikes = await attachLikeStats(reader, viewerId, data ?? []);
  const capsulesWithLikes = await attachCommentCounts(reader, withLikes);
  const normalizedProfile = normalizeProfile(profile);
  const profileWithFollows = await attachFollowStats(reader, viewerId, normalizedProfile);
  const profileWithMute = await attachMutedByMe(reader, viewerId, profileWithFollows);
  const profileWithBlock = await attachBlockedByMe(reader, viewerId, profileWithMute);

  let featuredCollection = null;
  if (offset === 0) {
    const featuredSelect = await reader
      .from('profiles')
      .select('featured_collection_id')
      .eq('id', profile.id)
      .maybeSingle();
    if (!featuredSelect.error) {
      featuredCollection = await loadFeaturedCollectionSummary(
        reader,
        featuredSelect.data?.featured_collection_id ?? null,
        { viewerId: viewerId || undefined, ownerId: profile.id },
      );
    }
  }

  res.json({
    profile: profileWithBlock,
    capsules: capsulesWithLikes,
    total: count ?? capsulesWithLikes.length,
    ...(stats ? { stats } : {}),
    ...(years ? { years } : {}),
    ...(tags ? { tags } : {}),
    ...(offset === 0 ? { featured_collection: featuredCollection } : {}),
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
  note: z.string().max(CAPSULE_NOTE_MAX).optional().nullable(),
  tags: z.array(z.string().max(CAPSULE_TAG_MAX_LEN)).max(CAPSULE_TAGS_MAX).optional(),
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
  parent_id: z.string().uuid().optional().nullable(),
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

capsulesRouter.post('/:id/comments', requireAuth, commentLimiter, async (req: AuthRequest, res) => {
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

  const parentId = parsed.data.parent_id ?? null;
  let parentAuthorId: string | null = null;

  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from('capsule_comments')
      .select('id, capsule_id, user_id, parent_id')
      .eq('id', parentId)
      .maybeSingle();

    if (parentError) {
      if (isMissingCommentsTable(parentError)) {
        res.status(503).json({
          error: 'Ejecuta la migración 20250711210000_capsule_comments.sql en Supabase.',
        });
        return;
      }
      if (isMissingParentIdColumn(parentError)) {
        res.status(503).json({
          error: 'Ejecuta la migración 20250823120000_capsule_comment_replies.sql en Supabase.',
        });
        return;
      }
      res.status(400).json({ error: parentError.message });
      return;
    }

    const parentErr = assertValidReplyParent(parent, capsule.id);
    if (parentErr) {
      res.status(parentErr.includes('no encontrado') ? 404 : 400).json({ error: parentErr });
      return;
    }

    parentAuthorId = parent!.user_id;
  }

  const insertRow: Record<string, unknown> = {
    capsule_id: capsule.id,
    user_id: req.userId!,
    body: parsed.data.body,
  };
  if (parentId) insertRow.parent_id = parentId;

  let { data, error } = await supabase
    .from('capsule_comments')
    .insert(insertRow)
    .select('id, capsule_id, user_id, body, created_at, parent_id')
    .single();

  if (error && parentId && isMissingParentIdColumn(error)) {
    res.status(503).json({
      error: 'Ejecuta la migración 20250823120000_capsule_comment_replies.sql en Supabase.',
    });
    return;
  }

  if (error && !parentId && isMissingParentIdColumn(error)) {
    ({ data, error } = await supabase
      .from('capsule_comments')
      .insert({
        capsule_id: capsule.id,
        user_id: req.userId!,
        body: parsed.data.body,
      })
      .select('id, capsule_id, user_id, body, created_at')
      .single());
  }

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

  // Respuesta: notifica al autor del comentario padre. Raíz: al dueño de la Capsule.
  // Si el padre ≠ dueño, el dueño también recibe alerta de actividad en su Capsule.
  if (parentAuthorId) {
    notifyUser({
      userId: parentAuthorId,
      actorId: req.userId!,
      type: 'comment',
      capsuleId: capsule.id,
      body: parsed.data.body,
    });
    if (parentAuthorId !== capsule.user_id) {
      notifyUser({
        userId: capsule.user_id,
        actorId: req.userId!,
        type: 'comment',
        capsuleId: capsule.id,
        body: parsed.data.body,
      });
    }
  } else {
    notifyUser({
      userId: capsule.user_id,
      actorId: req.userId!,
      type: 'comment',
      capsuleId: capsule.id,
      body: parsed.data.body,
    });
  }

  void notifyCommentMentions({
    body: parsed.data.body,
    actorId: req.userId!,
    capsuleId: capsule.id,
    capsuleOwnerId: capsule.user_id,
    extraSkipIds: parentAuthorId ? [parentAuthorId] : undefined,
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url')
    .eq('id', req.userId!)
    .maybeSingle();

  res.status(201).json({
    ...data,
    parent_id: (data as { parent_id?: string | null }).parent_id ?? parentId,
    author: profile
      ? {
          username: profile.username,
          display_name: profile.full_name ?? null,
          avatar_url: profile.avatar_url,
        }
      : null,
  });
});

capsulesRouter.patch('/:id/comments/:commentId', requireAuth, commentLimiter, async (req: AuthRequest, res) => {
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

  const editedAt = new Date().toISOString();
  let { data, error } = await supabase
    .from('capsule_comments')
    .update({ body: parsed.data.body, edited_at: editedAt })
    .eq('id', commentId)
    .eq('capsule_id', capsuleId)
    .eq('user_id', req.userId!)
    .select('id, capsule_id, user_id, body, created_at, parent_id, edited_at')
    .maybeSingle();

  if (error && isMissingEditedAtColumn(error)) {
    ({ data, error } = await supabase
      .from('capsule_comments')
      .update({ body: parsed.data.body })
      .eq('id', commentId)
      .eq('capsule_id', capsuleId)
      .eq('user_id', req.userId!)
      .select('id, capsule_id, user_id, body, created_at, parent_id')
      .maybeSingle());
  }

  if (error && isMissingParentIdColumn(error)) {
    let legacy = await supabase
      .from('capsule_comments')
      .update({ body: parsed.data.body, edited_at: editedAt })
      .eq('id', commentId)
      .eq('capsule_id', capsuleId)
      .eq('user_id', req.userId!)
      .select('id, capsule_id, user_id, body, created_at, edited_at')
      .maybeSingle();

    if (legacy.error && isMissingEditedAtColumn(legacy.error)) {
      legacy = await supabase
        .from('capsule_comments')
        .update({ body: parsed.data.body })
        .eq('id', commentId)
        .eq('capsule_id', capsuleId)
        .eq('user_id', req.userId!)
        .select('id, capsule_id, user_id, body, created_at')
        .maybeSingle();
    }

    if (legacy.error) {
      res.status(400).json({ error: legacy.error.message });
      return;
    }
    if (!legacy.data) {
      res.status(404).json({ error: 'Comentario no encontrado' });
      return;
    }
    data = {
      ...legacy.data,
      parent_id: null,
      edited_at: (legacy.data as { edited_at?: string | null }).edited_at ?? null,
    } as typeof data;
    error = null;
  }

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
    parent_id: (data as { parent_id?: string | null }).parent_id ?? null,
    edited_at: (data as { edited_at?: string | null }).edited_at ?? null,
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

  type CommentRef = { id: string; user_id: string; capsule_id: string; parent_id: string | null };

  let comment: CommentRef | null = null;

  const withParent = await supabase
    .from('capsule_comments')
    .select('id, user_id, capsule_id, parent_id')
    .eq('id', commentId)
    .eq('capsule_id', capsuleId)
    .maybeSingle();

  if (withParent.error) {
    if (isMissingCommentsTable(withParent.error)) {
      res.status(503).json({
        error: 'Ejecuta la migración 20250711210000_capsule_comments.sql en Supabase.',
      });
      return;
    }
    if (isMissingParentIdColumn(withParent.error)) {
      const legacy = await supabase
        .from('capsule_comments')
        .select('id, user_id, capsule_id')
        .eq('id', commentId)
        .eq('capsule_id', capsuleId)
        .maybeSingle();
      if (legacy.error) {
        res.status(400).json({ error: legacy.error.message });
        return;
      }
      comment = legacy.data ? { ...legacy.data, parent_id: null } : null;
    } else {
      res.status(400).json({ error: withParent.error.message });
      return;
    }
  } else {
    comment = withParent.data;
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

  if (viewerId && viewerId !== data.user_id) {
    const block = await getBlockRelation(viewerId, data.user_id as string);
    if (isBlockActive(block)) {
      res.status(404).json({ error: 'Capsule no encontrada' });
      return;
    }
  }

  const [withLikes] = await attachLikeStats(reader, viewerId, [data]);
  const [withComments] = await attachCommentCounts(reader, [withLikes]);

  const { data: profile } = await supabaseAnon
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', data.user_id)
    .maybeSingle();

  let followed_by_me = false;
  let follows_me = false;
  if (viewerId && profile && viewerId !== profile.id) {
    const { data: followRows, error: followError } = await reader
      .from('user_follows')
      .select('follower_id, following_id')
      .or(
        `and(follower_id.eq.${viewerId},following_id.eq.${profile.id}),and(follower_id.eq.${profile.id},following_id.eq.${viewerId})`,
      );

    if (!followError && followRows) {
      for (const row of followRows) {
        if (row.follower_id === viewerId && row.following_id === profile.id) {
          followed_by_me = true;
        }
        if (row.follower_id === profile.id && row.following_id === viewerId) {
          follows_me = true;
        }
      }
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
          follows_me,
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
      note: normalizeCapsuleNote(parsed.data.note),
      tags: normalizeCapsuleTags(parsed.data.tags),
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
    if (isMissingTagsColumn(error)) {
      res.status(503).json({ error: tagsMigrationHint() });
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

  void clearWantToGoAfterCapsule(req.userId!, parsed.data.match_id);

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
  const patch = {
    ...parsed.data,
    ...(Object.prototype.hasOwnProperty.call(parsed.data, 'note')
      ? { note: normalizeCapsuleNote(parsed.data.note) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(parsed.data, 'tags')
      ? { tags: normalizeCapsuleTags(parsed.data.tags) }
      : {}),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('capsules')
    .update(patch)
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
    if (isMissingTagsColumn(error)) {
      res.status(503).json({ error: tagsMigrationHint() });
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

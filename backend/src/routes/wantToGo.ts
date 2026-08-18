import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { optionalAuth, requireAuth, type AuthRequest } from '../middleware/auth.js';
import { isValidCapsuleMatchId } from '../lib/manualMatch.js';
import { fetchProfileByUsername, profilesAlignMigrationHint } from '../lib/profileLookup.js';
import { normalizeProfile } from '../lib/profileNormalize.js';
import { supabaseAnon } from '../lib/supabase.js';
import { getBlockRelation, isBlockActive } from '../lib/userBlocks.js';
import {
  addWantToGoMatch,
  clearPlayedWantToGoWithoutCapsule,
  listPublicWantToGoMatches,
  listWantToGoInCommon,
  listWantToGoMatchIds,
  listWantToGoMatches,
  attachAlsoWantToGo,
  removeWantToGoMatch,
} from '../lib/wantToGo.js';

export const wantToGoRouter = Router();

function wantToGoErrorStatus(err: unknown): number | undefined {
  return typeof (err as { status?: unknown })?.status === 'number'
    ? (err as { status: number }).status
    : undefined;
}

/** GET /api/want-to-go/user/:username — próximos partidos (sin notas). Público. */
wantToGoRouter.get('/user/:username', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
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

    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 50);
    const result = await listPublicWantToGoMatches(profile.id, { limit });
    const author = normalizeProfile(profile);
    res.json({
      profile: {
        username: author.username,
        display_name: author.display_name,
        avatar_url: author.avatar_url,
      },
      items: result.items,
      total: result.total,
      limit,
    });
  } catch (err) {
    const status = wantToGoErrorStatus(err);
    if (status === 503) {
      res.status(503).json({
        error: err instanceof Error ? err.message : 'Quiero ir no disponible',
      });
      return;
    }
    next(err);
  }
});

wantToGoRouter.use(requireAuth);

const mutateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Inténtalo en un minuto.' },
});

const addSchema = z.object({
  match_id: z.number().int(),
  match_played_at: z.string().trim().max(40).optional().nullable(),
  home_team_name: z.string().trim().min(1).max(80),
  away_team_name: z.string().trim().min(1).max(80),
  home_team_crest: z.string().trim().max(500).optional().nullable(),
  away_team_crest: z.string().trim().max(500).optional().nullable(),
  competition_name: z.string().trim().max(80).optional().nullable(),
  home_score: z.number().int().min(0).max(99).optional().nullable(),
  away_score: z.number().int().min(0).max(99).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

wantToGoRouter.get('/me', async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const result = await listWantToGoMatches(req.userId!, { limit, offset });
    const items = await attachAlsoWantToGo(req.userId!, result.items);
    res.json({ items, total: result.total, limit, offset });
  } catch (err) {
    const status = wantToGoErrorStatus(err);
    if (status === 503) {
      res.status(503).json({
        error: err instanceof Error ? err.message : 'Quiero ir no disponible',
      });
      return;
    }
    next(err);
  }
});

/** IDs en la lista (para badges en búsqueda). */
wantToGoRouter.get('/me/ids', async (req: AuthRequest, res, next) => {
  try {
    const match_ids = await listWantToGoMatchIds(req.userId!);
    res.json({ match_ids });
  } catch (err) {
    const status = wantToGoErrorStatus(err);
    if (status === 503) {
      res.status(503).json({
        error: err instanceof Error ? err.message : 'Quiero ir no disponible',
      });
      return;
    }
    next(err);
  }
});

/** Follows que también tienen este partido en Quiero ir. */
wantToGoRouter.get('/me/:matchId/following', async (req: AuthRequest, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    if (!isValidCapsuleMatchId(matchId)) {
      res.status(400).json({ error: 'match_id inválido' });
      return;
    }
    const profiles = await listWantToGoInCommon(req.userId!, matchId);
    res.json({ profiles, total: profiles.length });
  } catch (err) {
    const status = wantToGoErrorStatus(err);
    if (status === 400 || status === 503) {
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Quiero ir no disponible',
      });
      return;
    }
    next(err);
  }
});

wantToGoRouter.post('/', mutateLimiter, async (req: AuthRequest, res, next) => {
  try {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success || !isValidCapsuleMatchId(parsed.data.match_id)) {
      res.status(400).json({ error: 'Datos de partido inválidos' });
      return;
    }

    const item = await addWantToGoMatch(req.userId!, parsed.data);
    res.status(201).json({ item });
  } catch (err) {
    const status = wantToGoErrorStatus(err);
    if (status === 400 || status === 503) {
      res.status(status).json({
        error: err instanceof Error ? err.message : 'No se pudo guardar en Quiero ir',
      });
      return;
    }
    next(err);
  }
});

wantToGoRouter.delete('/played', mutateLimiter, async (req: AuthRequest, res, next) => {
  try {
    const result = await clearPlayedWantToGoWithoutCapsule(req.userId!);
    res.json({ ok: true, removed: result.removed });
  } catch (err) {
    const status = wantToGoErrorStatus(err);
    if (status === 400 || status === 503) {
      res.status(status).json({
        error: err instanceof Error ? err.message : 'No se pudo limpiar Quiero ir',
      });
      return;
    }
    next(err);
  }
});

wantToGoRouter.delete('/:matchId', mutateLimiter, async (req: AuthRequest, res, next) => {
  try {
    const matchId = Number(req.params.matchId);
    if (!isValidCapsuleMatchId(matchId)) {
      res.status(400).json({ error: 'match_id inválido' });
      return;
    }

    const removed = await removeWantToGoMatch(req.userId!, matchId);
    if (!removed) {
      res.status(404).json({ error: 'No está en Quiero ir' });
      return;
    }
    res.json({ ok: true, match_id: matchId });
  } catch (err) {
    const status = wantToGoErrorStatus(err);
    if (status === 400 || status === 503) {
      res.status(status).json({
        error: err instanceof Error ? err.message : 'No se pudo quitar de Quiero ir',
      });
      return;
    }
    next(err);
  }
});

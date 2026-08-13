import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { isValidCapsuleMatchId } from '../lib/manualMatch.js';
import {
  addWantToGoMatch,
  listWantToGoInCommon,
  listWantToGoMatchIds,
  listWantToGoMatches,
  removeWantToGoMatch,
} from '../lib/wantToGo.js';

export const wantToGoRouter = Router();

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

function wantToGoErrorStatus(err: unknown): number | undefined {
  return typeof (err as { status?: unknown })?.status === 'number'
    ? (err as { status: number }).status
    : undefined;
}

wantToGoRouter.get('/me', async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const result = await listWantToGoMatches(req.userId!, { limit, offset });
    res.json({ items: result.items, total: result.total, limit, offset });
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

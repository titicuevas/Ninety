import { Router } from 'express';
import { loadAdminMetrics } from '../lib/adminMetrics.js';
import { searchMatches } from '../lib/footballSearch.js';
import { env } from '../config/loadEnv.js';
import { FootballApiError } from '../lib/footballApi.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/metrics', async (_req: AuthRequest, res, next) => {
  try {
    const metrics = await loadAdminMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

/**
 * Smoke autenticado de búsqueda de partidos (Football Data).
 * No sustituye el probe local; valida clave + upstream desde prod/staging.
 */
adminRouter.get('/football-search-smoke', async (req: AuthRequest, res, next) => {
  try {
    if (!env.FOOTBALL_DATA_API_KEY?.trim()) {
      res.status(503).json({ ok: false, error: 'Football API no configurada' });
      return;
    }

    const query = String(req.query.q ?? 'betis').trim() || 'betis';
    const started = Date.now();
    const matches = await searchMatches({ query });
    res.json({
      ok: true,
      query,
      matches: matches.length,
      sample: matches.slice(0, 3).map((m) => ({
        id: m.id,
        utcDate: m.utcDate,
        home: m.homeTeam.name,
        away: m.awayTeam.name,
        competition: m.competition?.name ?? null,
      })),
      latency_ms: Date.now() - started,
    });
  } catch (err) {
    if (err instanceof FootballApiError) {
      res.status(err.status).json({
        ok: false,
        error: err.message,
        retryAfterSeconds: err.retryAfterSeconds,
      });
      return;
    }
    next(err);
  }
});

import { Router, type NextFunction, type Request, type Response } from 'express';
import { FootballApiError, fetchFootballApi } from '../lib/footballApi.js';
import { getCuratedCompetitions } from '../lib/footballCompetitions.js';
import { searchMatches, type FootballMatch } from '../lib/footballSearch.js';
import { loadTeamsForSearch } from '../lib/footballTeamCatalog.js';
import { getTeamCompetitionsForQuery } from '../lib/footballTeamCompetitions.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/loadEnv.js';

export const footballRouter = Router();

function requireFootballApiKey(_req: Request, res: Response, next: NextFunction) {
  if (!env.FOOTBALL_DATA_API_KEY) {
    res.status(503).json({ error: 'Football API no configurada' });
    return;
  }
  next();
}

footballRouter.use(requireFootballApiKey);

function serializeMatch(match: FootballMatch) {
  return {
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    homeTeam: {
      id: match.homeTeam.id,
      name: match.homeTeam.name,
      shortName: match.homeTeam.shortName,
      crest: match.homeTeam.crest,
    },
    awayTeam: {
      id: match.awayTeam.id,
      name: match.awayTeam.name,
      shortName: match.awayTeam.shortName,
      crest: match.awayTeam.crest,
    },
    score: match.score,
    competition: match.competition
      ? {
          id: match.competition.id,
          name: match.competition.name,
          code: match.competition.code,
        }
      : undefined,
  };
}

function parseSeason(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const season = Number(value);
  return Number.isInteger(season) && season >= 1900 ? season : undefined;
}

footballRouter.get('/competitions/curated', requireAuth, (_req, res) => {
  res.json({ competitions: getCuratedCompetitions() });
});

footballRouter.get('/matches/search', requireAuth, async (req, res, next) => {
  try {
    const query = String(req.query.q ?? '').trim();
    const competition = String(req.query.competition ?? '').trim() || undefined;
    const season = parseSeason(req.query.season);

    if (!query && !competition) {
      res.status(400).json({ error: 'Escribe un equipo o elige una competición' });
      return;
    }

    const matches = await searchMatches({ query, competition, season });
    res.json({ matches: matches.map(serializeMatch) });
  } catch (err) {
    if (err instanceof FootballApiError) {
      res.status(err.status).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });
      return;
    }
    next(err);
  }
});

footballRouter.get('/competitions', requireAuth, async (_req, res, next) => {
  try {
    const data = await fetchFootballApi('/competitions');
    res.json(data);
  } catch (err) {
    if (err instanceof FootballApiError) {
      res.status(err.status).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });
      return;
    }
    next(err);
  }
});

footballRouter.get('/teams/competitions', requireAuth, async (req, res, next) => {
  try {
    const query = String(req.query.q ?? '').trim();
    const result = await getTeamCompetitionsForQuery(query);
    res.json(result);
  } catch (err) {
    if (err instanceof FootballApiError) {
      res.status(err.status).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });
      return;
    }
    next(err);
  }
});

footballRouter.get('/teams', requireAuth, async (req, res, next) => {
  try {
    const query = String(req.query.q ?? '').trim();
    if (!query) {
      res.status(400).json({ error: 'Parámetro q requerido' });
      return;
    }

    const competition = String(req.query.competition ?? '').trim() || undefined;
    const seasonRaw = req.query.season;
    const season = seasonRaw != null && seasonRaw !== '' ? Number(seasonRaw) : undefined;
    const teams = await loadTeamsForSearch({ query, competitionCode: competition, season });
    res.json({ teams });
  } catch (err) {
    if (err instanceof FootballApiError) {
      res.status(err.status).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });
      return;
    }
    next(err);
  }
});

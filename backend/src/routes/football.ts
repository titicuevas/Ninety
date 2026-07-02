import { Router, type NextFunction, type Request, type Response } from 'express';
import { env } from '../config/loadEnv.js';
import { requireAuth } from '../middleware/auth.js';

const FOOTBALL_API_BASE = 'https://api.football-data.org/v4';

interface FootballTeam {
  name: string;
}

interface FootballMatch {
  homeTeam: FootballTeam;
  awayTeam: FootballTeam;
}

interface CompetitionsResponse {
  competitions?: { id: number }[];
}

interface MatchesResponse {
  matches?: FootballMatch[];
}

interface TeamsResponse {
  teams?: FootballTeam[];
}

export const footballRouter = Router();

function requireFootballApiKey(_req: Request, res: Response, next: NextFunction) {
  if (!env.FOOTBALL_DATA_API_KEY) {
    res.status(503).json({ error: 'Football API no configurada' });
    return;
  }
  next();
}

footballRouter.use(requireFootballApiKey);

async function fetchFootballApi<T>(path: string): Promise<T> {
  const response = await fetch(`${FOOTBALL_API_BASE}${path}`, {
    headers: { 'X-Auth-Token': env.FOOTBALL_DATA_API_KEY },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Football API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

footballRouter.get('/matches/search', requireAuth, async (req, res, next) => {
  try {
    const query = String(req.query.q ?? '').trim();

    if (!query) {
      res.status(400).json({ error: 'Parámetro q requerido' });
      return;
    }

    // football-data.org no tiene búsqueda libre; filtramos competiciones principales
    const competitions = await fetchFootballApi<CompetitionsResponse>('/competitions');
    const matches: FootballMatch[] = [];

    for (const comp of competitions.competitions?.slice(0, 5) ?? []) {
      const data = await fetchFootballApi<MatchesResponse>(`/competitions/${comp.id}/matches?status=FINISHED`);
      const filtered = (data.matches ?? []).filter((m) => {
        const text = `${m.homeTeam.name} ${m.awayTeam.name}`.toLowerCase();
        return text.includes(query.toLowerCase());
      });
      matches.push(...filtered.slice(0, 10));
    }

    res.json({ matches: matches.slice(0, 20) });
  } catch (err) {
    next(err);
  }
});

footballRouter.get('/competitions', requireAuth, async (_req, res, next) => {
  try {
    const data = await fetchFootballApi('/competitions');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

footballRouter.get('/teams', requireAuth, async (req, res, next) => {
  try {
    const query = String(req.query.q ?? '').trim();
    const data = await fetchFootballApi<TeamsResponse>('/teams');
    const teams = (data.teams ?? []).filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase()),
    );
    res.json({ teams: teams.slice(0, 20) });
  } catch (err) {
    next(err);
  }
});

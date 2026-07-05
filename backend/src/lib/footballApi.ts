import { env } from '../config/loadEnv.js';
import { getCached, setCached } from './footballCache.js';

const FOOTBALL_API_BASE = 'https://api.football-data.org/v4';

export class FootballApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'FootballApiError';
  }
}

export async function fetchFootballApi<T>(path: string): Promise<T> {
  const cacheKey = `football:${path}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${FOOTBALL_API_BASE}${path}`, {
    headers: { 'X-Auth-Token': env.FOOTBALL_DATA_API_KEY },
  });

  if (!response.ok) {
    const text = await response.text();
    let retryAfterSeconds: number | undefined;

    if (response.status === 429) {
      try {
        const body = JSON.parse(text) as { message?: string };
        const match = body.message?.match(/wait (\d+) second/i);
        if (match) retryAfterSeconds = Number(match[1]);
      } catch {
        // ignore parse errors
      }

      throw new FootballApiError(
        retryAfterSeconds
          ? `Límite de la API de fútbol alcanzado. Espera ${retryAfterSeconds} segundos e inténtalo de nuevo.`
          : 'Límite de la API de fútbol alcanzado. Inténtalo en un minuto.',
        429,
        retryAfterSeconds,
      );
    }

    if (response.status === 403) {
      throw new FootballApiError(
        'Esta competición no está incluida en tu plan de football-data.org. Busca por el nombre del equipo o la selección.',
        403,
      );
    }

    throw new FootballApiError(
      `Football API error ${response.status}: ${text}`,
      response.status,
    );
  }

  const data = (await response.json()) as T;
  setCached(cacheKey, data);
  return data;
}

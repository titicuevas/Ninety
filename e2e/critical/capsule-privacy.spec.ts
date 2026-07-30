import { expect, test, type APIRequestContext } from '@playwright/test';
import { API_BASE, openAuthenticatedHome, readAccessToken } from '../helpers/auth';

type CapsuleSummary = { id: string; match_id: number; is_public?: boolean };
type CapsulesResponse = { capsules?: CapsuleSummary[] };

type MatchSearchResponse = {
  matches?: Array<{
    id: number;
    utcDate?: string;
    homeTeam: { name: string; crest?: string | null };
    awayTeam: { name: string; crest?: string | null };
    competition?: { name?: string | null };
    score?: { fullTime?: { home?: number | null; away?: number | null } };
  }>;
};

const SEARCH_CANDIDATES = ['Liverpool', 'Argentina', 'Betis', 'Barcelona', 'Real Madrid'];

async function getJson<T>(url: string, token: string | null, request: APIRequestContext) {
  const response = await request.get(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return { response, body: (await response.json().catch(() => ({}))) as T };
}

async function pickUnsavedMatch(token: string, request: APIRequestContext) {
  const { response, body } = await getJson<CapsulesResponse>(
    `${API_BASE}/api/capsules/me`,
    token,
    request,
  );
  expect(response.ok()).toBeTruthy();
  const existingMatchIds = new Set((body.capsules ?? []).map((capsule) => capsule.match_id));

  for (const query of SEARCH_CANDIDATES) {
    const search = await getJson<MatchSearchResponse>(
      `${API_BASE}/api/football/matches/search?q=${encodeURIComponent(query)}`,
      token,
      request,
    );
    expect(search.response.ok()).toBeTruthy();
    const candidate = (search.body.matches ?? []).find((match) => !existingMatchIds.has(match.id));
    if (candidate) return candidate;
  }

  throw new Error('No encontré un partido nuevo para probar privacidad.');
}

test.describe('Crítico — privacidad de Capsule @critical', () => {
  test('capsule privada no es visible sin ser el dueño', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const match = await pickUnsavedMatch(token!, request);
    const watchedAt = (match.utcDate ?? new Date().toISOString()).slice(0, 10);

    const create = await request.post(`${API_BASE}/api/capsules`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        match_id: match.id,
        match_played_at: match.utcDate ?? null,
        home_team_name: match.homeTeam.name,
        away_team_name: match.awayTeam.name,
        home_team_crest: match.homeTeam.crest ?? null,
        away_team_crest: match.awayTeam.crest ?? null,
        competition_name: match.competition?.name ?? null,
        home_score: match.score?.fullTime?.home ?? null,
        away_score: match.score?.fullTime?.away ?? null,
        watched_at: watchedAt,
        note: `E2E privada ${Date.now()}`,
        is_public: false,
      },
    });

    if (create.status() === 503) {
      test.skip(true, 'Migración de privacidad pendiente en Supabase');
      return;
    }

    expect(create.status()).toBe(201);
    const created = (await create.json()) as CapsuleSummary;
    expect(created.id).toBeTruthy();
    expect(created.is_public).toBe(false);

    const guest = await request.get(`${API_BASE}/api/capsules/${created.id}`);
    expect(guest.status()).toBe(404);

    const owner = await request.get(`${API_BASE}/api/capsules/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(owner.ok()).toBeTruthy();

    const makePublic = await request.patch(`${API_BASE}/api/capsules/${created.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { is_public: true },
    });
    expect(makePublic.ok()).toBeTruthy();

    const guestAfter = await request.get(`${API_BASE}/api/capsules/${created.id}`);
    expect(guestAfter.ok()).toBeTruthy();

    const del = await request.delete(`${API_BASE}/api/capsules/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(del.status()).toBe(204);
  });
});

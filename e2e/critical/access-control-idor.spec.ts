import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  API_BASE,
  obtainApiSession,
  openAuthenticatedHome,
  readAccessToken,
  requireDemoCredentials,
} from '../helpers/auth';

/**
 * Checklist TikTok/IDOR: guest y otro usuario no pueden leer/editar/borrar
 * Capsules privadas; IDs inventados no filtran datos; /me es solo del dueño.
 */

type CapsuleSummary = { id: string; match_id: number; is_public?: boolean; user_id?: string };
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
const FAKE_UUID = '00000000-0000-4000-8000-00000000dead';

async function apiJson<T>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  token?: string | null,
  data?: unknown,
) {
  const response = await request.fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    data,
    timeout: 30_000,
  });
  const text = await response.text();
  let body: T | Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as T) : {};
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { response, body: body as T, text };
}

async function loginAs(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
    timeout: 30_000,
  });
  const bodyText = await res.text();
  if (!res.ok()) {
    throw new Error(`Login ${email} → ${res.status()}: ${bodyText.slice(0, 180)}`);
  }
  const body = JSON.parse(bodyText) as { session?: { access_token?: string } };
  const token = body.session?.access_token;
  if (!token) throw new Error(`Login ${email} sin access_token`);
  return token;
}

async function pickUnsavedMatch(token: string, request: APIRequestContext) {
  const mine = await apiJson<CapsulesResponse>(
    request,
    'GET',
    `${API_BASE}/api/capsules/me`,
    token,
  );
  expect(mine.response.ok()).toBeTruthy();
  const existing = new Set((mine.body.capsules ?? []).map((c) => c.match_id));

  for (const query of SEARCH_CANDIDATES) {
    const search = await apiJson<MatchSearchResponse>(
      request,
      'GET',
      `${API_BASE}/api/football/matches/search?q=${encodeURIComponent(query)}`,
      token,
    );
    if (!search.response.ok()) continue;
    const candidate = (search.body.matches ?? []).find((m) => !existing.has(m.id));
    if (candidate) return candidate;
  }
  throw new Error('No encontré partido libre para prueba IDOR');
}

async function createPrivateCapsule(token: string, request: APIRequestContext) {
  const match = await pickUnsavedMatch(token, request);
  const watchedAt = (match.utcDate ?? new Date().toISOString()).slice(0, 10);
  const create = await apiJson<CapsuleSummary>(request, 'POST', `${API_BASE}/api/capsules`, token, {
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
    note: `E2E IDOR privada ${Date.now()}`,
    is_public: false,
  });
  return create;
}

test.describe('Crítico — control de acceso IDOR @critical', () => {
  test('guest y otro usuario no leen/editan/borran Capsule privada', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const ownerToken = await readAccessToken(page);
    expect(ownerToken).toBeTruthy();

    const create = await createPrivateCapsule(ownerToken!, request);
    if (create.response.status() === 503) {
      test.skip(true, 'Privacidad/migraciones no disponibles en API');
      return;
    }
    expect(create.response.status(), create.text.slice(0, 200)).toBe(201);
    const capsuleId = create.body.id;
    expect(capsuleId).toBeTruthy();

    try {
      // Guest
      const guestGet = await apiJson(request, 'GET', `${API_BASE}/api/capsules/${capsuleId}`);
      expect(guestGet.response.status()).toBe(404);
      expect(JSON.stringify(guestGet.body)).not.toMatch(/stack|password|secret|supabase/i);

      const guestPatch = await apiJson(request, 'PATCH', `${API_BASE}/api/capsules/${capsuleId}`, null, {
        note: 'hack',
      });
      expect([401, 403, 404]).toContain(guestPatch.response.status());

      const guestDel = await apiJson(request, 'DELETE', `${API_BASE}/api/capsules/${capsuleId}`);
      expect([401, 403, 404]).toContain(guestDel.response.status());

      // Otro usuario autenticado (fan del seed)
      const { password } = requireDemoCredentials();
      let otherToken: string | null = null;
      try {
        otherToken = await loginAs(request, 'fan01@ninety.app', password);
      } catch (err) {
        test.skip(
          true,
          `No se pudo login fan01 (¿seed:fans?): ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }

      const otherGet = await apiJson(
        request,
        'GET',
        `${API_BASE}/api/capsules/${capsuleId}`,
        otherToken,
      );
      expect(otherGet.response.status()).toBe(404);

      const otherPatch = await apiJson(
        request,
        'PATCH',
        `${API_BASE}/api/capsules/${capsuleId}`,
        otherToken,
        { note: 'intento ajeno', is_public: true },
      );
      expect([403, 404]).toContain(otherPatch.response.status());

      const otherDel = await apiJson(
        request,
        'DELETE',
        `${API_BASE}/api/capsules/${capsuleId}`,
        otherToken,
      );
      expect([403, 404]).toContain(otherDel.response.status());

      // Dueño sí ve
      const ownerGet = await apiJson(
        request,
        'GET',
        `${API_BASE}/api/capsules/${capsuleId}`,
        ownerToken,
      );
      expect(ownerGet.response.ok()).toBeTruthy();

      // Pública: guest y otro sí leen; otro sigue sin borrar
      const makePublic = await apiJson(
        request,
        'PATCH',
        `${API_BASE}/api/capsules/${capsuleId}`,
        ownerToken,
        { is_public: true },
      );
      expect(makePublic.response.ok()).toBeTruthy();

      const guestPublic = await apiJson(request, 'GET', `${API_BASE}/api/capsules/${capsuleId}`);
      expect(guestPublic.response.ok()).toBeTruthy();

      const otherPublic = await apiJson(
        request,
        'GET',
        `${API_BASE}/api/capsules/${capsuleId}`,
        otherToken,
      );
      expect(otherPublic.response.ok()).toBeTruthy();

      const otherDelPublic = await apiJson(
        request,
        'DELETE',
        `${API_BASE}/api/capsules/${capsuleId}`,
        otherToken,
      );
      expect([403, 404]).toContain(otherDelPublic.response.status());
    } finally {
      await apiJson(request, 'DELETE', `${API_BASE}/api/capsules/${capsuleId}`, ownerToken);
    }
  });

  test('UUID inventado y /me no filtran datos ajenos', async ({ request }) => {
    const session = await obtainApiSession(request);
    const token = session.access_token;

    const fake = await apiJson(request, 'GET', `${API_BASE}/api/capsules/${FAKE_UUID}`, token);
    expect(fake.response.status()).toBe(404);
    expect(JSON.stringify(fake.body)).not.toMatch(/stack|at Object\.|node_modules/i);

    const me = await apiJson<CapsulesResponse>(
      request,
      'GET',
      `${API_BASE}/api/capsules/me?limit=5`,
      token,
    );
    expect(me.response.ok()).toBeTruthy();
    for (const c of me.body.capsules ?? []) {
      if (c.user_id) expect(c.user_id).toBe(session.user.id);
    }

    const unauthMe = await apiJson(request, 'GET', `${API_BASE}/api/capsules/me`);
    expect(unauthMe.response.status()).toBe(401);
  });
});

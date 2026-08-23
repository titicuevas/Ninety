import { expect, test, type APIRequestContext } from '@playwright/test';
import { API_BASE, goAppNav, openAuthenticatedHome, readAccessToken } from '../helpers/auth';
import { deleteOwnCapsule } from '../helpers/e2eCapsuleNotes';

type CapsuleSummary = {
  id?: string;
  match_id: number;
  home_team_name?: string;
  away_team_name?: string;
};
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

const JPEG_BUFFER = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEBAD8Af//Z',
  'base64',
);

const SEARCH_CANDIDATES = [
  'Liverpool',
  'Argentina',
  'Betis',
  'Barcelona',
  'Madrid',
  'Arsenal',
  'Bayern',
  'Inter',
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getJson<T>(url: string, token: string, request: APIRequestContext) {
  const response = await request.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

async function pickUnsavedMatch(token: string, request: APIRequestContext) {
  const existing = await getJson<CapsulesResponse>(`${API_BASE}/api/capsules/me`, token, request);
  const existingMatchIds = new Set((existing.capsules ?? []).map((capsule) => capsule.match_id));

  for (const query of SEARCH_CANDIDATES) {
    const response = await request.get(
      `${API_BASE}/api/football/matches/search?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok()) continue;
    const data = (await response.json()) as MatchSearchResponse;
    const candidate = (data.matches ?? []).find((match) => !existingMatchIds.has(match.id));
    if (candidate) return { query, match: candidate };
  }

  return null;
}

test.describe('Crítico — creación de capsule con fotos @critical', () => {
  test('crea una capsule con fotos desde la UI autenticada', async ({ page, request }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await openAuthenticatedHome(page);

    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const found = await pickUnsavedMatch(token!, request);
    expect(
      found,
      'La cuenta QA necesita al menos un partido no guardado entre las búsquedas candidatas',
    ).toBeTruthy();
    const { query, match } = found!;
    const note = `E2E fotos ${Date.now()}`;
    let createdId: string | undefined;

    try {
      await goAppNav(page, /buscar/i);
      await expect(page).toHaveURL(/\/search/);
      await page.getByLabel('Equipo o rival').fill(query);
      await expect(page).toHaveURL(
        new RegExp(`[?&]q=${encodeURIComponent(query).replace(/%20/g, '(?:%20|\\+)')}(?:&|$)`, 'i'),
      );

      const matchButton = page.getByRole('button', {
        name: new RegExp(
          `Guardar partido: ${escapeRegExp(match.homeTeam.name)}.*${escapeRegExp(match.awayTeam.name)}`,
          'i',
        ),
      });
      await expect(matchButton.first()).toBeVisible({ timeout: 20_000 });
      await matchButton.first().focus();
      await expect(matchButton.first()).toBeFocused();
      await matchButton.first().press('Enter');

      await expect
        .poll(() =>
          page.evaluate(() => {
            const raw = sessionStorage.getItem('ninety.draftMatch:v1');
            return raw ? (JSON.parse(raw) as { id?: number }).id : null;
          }),
        )
        .toBe(match.id);
      expect(pageErrors, 'La selección del partido no debe lanzar errores en el navegador').toEqual([]);

      await expect(page).toHaveURL(/\/capsules\/new/);
      await expect(page.getByRole('heading', { name: /nueva capsule/i })).toBeVisible();
      await expect(page.getByText(match.homeTeam.name).first()).toBeVisible();

      // Refresh no debe tirar a /search: el partido queda en sessionStorage
      await page.reload();
      await expect(page).toHaveURL(/\/capsules\/new/);
      await expect(page.getByRole('heading', { name: /nueva capsule/i })).toBeVisible();
      await expect(page.getByText(match.homeTeam.name).first()).toBeVisible();

      const draftNote = `Borrador E2E ${Date.now()}`;
      await page.getByRole('radio', { name: '3 de 5 estrellas' }).click();
      await page.getByLabel('Reseña corta (opcional)').fill(draftNote);
      await page.getByRole('radio', { name: /estadio/i }).click();

      // Dar margen al debounce de 250ms antes de comprobar sessionStorage
      await page.waitForTimeout(500);

      // Debounce 250ms en saveDraftCapsuleMemory — esperar persistencia real
      await page.waitForFunction(
        (note) => {
          try {
            const raw = sessionStorage.getItem('ninety.draftCapsuleMemory:v1');
            if (!raw) return false;
            return (JSON.parse(raw) as { note?: string }).note === note;
          } catch {
            return false;
          }
        },
        draftNote,
        { timeout: 10_000 },
      );

      // El borrador de memoria también sobrevive al refresh (fotos no)
      await page.reload();
      await expect(page).toHaveURL(/\/capsules\/new/);
      await expect(page.getByLabel('Reseña corta (opcional)')).toHaveValue(draftNote, { timeout: 10_000 });
      await expect(page.getByRole('radio', { name: '3 de 5 estrellas' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await expect(page.getByRole('radio', { name: /estadio/i })).toHaveAttribute('aria-checked', 'true');

      await page.locator('input[type="file"]').first().setInputFiles([
        { name: 'photo-1.jpg', mimeType: 'image/jpeg', buffer: JPEG_BUFFER },
        { name: 'photo-2.jpg', mimeType: 'image/jpeg', buffer: JPEG_BUFFER },
      ]);

      await expect(page.getByText(/^2\/9\b/)).toBeVisible({ timeout: 20_000 });
      await page.getByRole('radio', { name: '4 de 5 estrellas' }).click();
      await page.getByLabel('Reseña corta (opcional)').fill(note);
      await page.getByRole('button', { name: /guardar capsule/i }).click();

      await expect(page).toHaveURL(/\/c\/[0-9a-f-]{8,}/i, { timeout: 30_000 });
      createdId = page.url().match(/\/c\/([0-9a-f-]{8,})/i)?.[1];
      await expect(page.getByText(note)).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole('button', { name: /ampliar foto 1 de/i })).toBeVisible();
    } finally {
      if (createdId) {
        await deleteOwnCapsule(page, request, createdId);
      }
    }
  });

  test('partido ya guardado abre la Capsule desde Buscar', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const found = await pickUnsavedMatch(token!, request);
    expect(
      found,
      'La cuenta QA necesita un partido disponible para preparar el caso duplicado',
    ).toBeTruthy();
    const { query, match } = found!;
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
        watched_at: (match.utcDate ?? new Date().toISOString()).slice(0, 10),
        note: `Fixture duplicado E2E ${Date.now()}`,
        is_public: false,
      },
    });
    expect(create.status()).toBe(201);
    const capsule = (await create.json()) as { id: string };

    try {
      await goAppNav(page, /buscar/i);
      await expect(page).toHaveURL(/\/search/);
      await page.getByLabel('Equipo o rival').fill(query);
      await expect(page).toHaveURL(
        new RegExp(`[?&]q=${encodeURIComponent(query).replace(/%20/g, '(?:%20|\\+)')}(?:&|$)`, 'i'),
      );
      await page.reload();

      const savedButton = page.getByRole('button', {
        name: new RegExp(
          `Ver Capsule: ${escapeRegExp(match.homeTeam.name)}.*${escapeRegExp(match.awayTeam.name)}`,
          'i',
        ),
      });
      await expect(savedButton.first()).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/en tu diario/i).first()).toBeVisible();
      await savedButton.first().focus();
      await expect(savedButton.first()).toBeFocused();
      await savedButton.first().press('Enter');
      await expect(page).toHaveURL(new RegExp(`/c/${capsule.id}`), { timeout: 15_000 });
    } finally {
      await deleteOwnCapsule(page, request, capsule.id);
    }
  });
});

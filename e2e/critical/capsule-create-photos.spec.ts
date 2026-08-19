import { expect, test, type APIRequestContext } from '@playwright/test';
import { API_BASE, goAppNav, openAuthenticatedHome, readAccessToken } from '../helpers/auth';
import { deleteOwnCapsule } from '../helpers/e2eCapsuleNotes';

type CapsuleSummary = { match_id: number };
type CapsulesResponse = { capsules?: CapsuleSummary[] };

type MatchSearchResponse = {
  matches?: Array<{
    id: number;
    homeTeam: { name: string };
    awayTeam: { name: string };
  }>;
};

const JPEG_BUFFER = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEBAD8Af//Z',
  'base64',
);

const SEARCH_CANDIDATES = ['Liverpool', 'Argentina', 'Betis', 'Barcelona'];

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
    const data = await getJson<MatchSearchResponse>(
      `${API_BASE}/api/football/matches/search?q=${encodeURIComponent(query)}`,
      token,
      request,
    );
    const candidate = (data.matches ?? []).find((match) => !existingMatchIds.has(match.id));
    if (candidate) return { query, match: candidate };
  }

  return null;
}

test.describe('Crítico — creación de capsule con fotos @critical', () => {
  test('crea una capsule con fotos desde la UI autenticada', async ({ page, request }) => {
    // Este test requiere: búsqueda de partidos funcional, Supabase Storage configurado
    // y redirección completa a /capsules/new. Solo se verifica en staging/Railway.
    test.skip(
      !process.env.E2E_SITE_URL,
      'Requiere entorno staging con Storage configurado — define E2E_SITE_URL para ejecutar',
    );
    await openAuthenticatedHome(page);

    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const found = await pickUnsavedMatch(token!, request);
    if (!found) {
      test.skip(true, 'No hay partidos disponibles para la cuenta QA en las búsquedas candidatas');
      return;
    }
    const { query, match } = found;
    const note = `E2E fotos ${Date.now()}`;
    let createdId: string | undefined;

    try {
      await goAppNav(page, /buscar/i);
      await expect(page).toHaveURL(/\/search/);
      await page.getByLabel('Equipo o rival').fill(query);

      const matchButton = page.getByRole('button', {
        name: new RegExp(
          `Guardar partido: ${escapeRegExp(match.homeTeam.name)}.*${escapeRegExp(match.awayTeam.name)}`,
          'i',
        ),
      });
      await expect(matchButton.first()).toBeVisible({ timeout: 20_000 });
      await matchButton.first().click();

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
            const raw = sessionStorage.getItem('ninety.draftCapsuleMemory');
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

    const existing = await getJson<{
      capsules?: Array<{
        id: string;
        match_id: number;
        home_team_name: string;
        away_team_name: string;
      }>;
    }>(`${API_BASE}/api/capsules/me?limit=5&offset=0`, token!, request);

    const capsule = existing.capsules?.[0];
    test.skip(!capsule, 'La cuenta QA no tiene Capsules para probar duplicados');

    const teamQuery = capsule!.home_team_name.split(/\s+/)[0] || capsule!.home_team_name;
    await goAppNav(page, /buscar/i);
    await expect(page).toHaveURL(/\/search/);
    await page.getByLabel('Equipo o rival').fill(teamQuery);

    const savedButton = page.getByRole('button', {
      name: new RegExp(
        `Ver Capsule: ${escapeRegExp(capsule!.home_team_name)}.*${escapeRegExp(capsule!.away_team_name)}`,
        'i',
      ),
    });
    await expect(savedButton.first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/en tu diario/i).first()).toBeVisible();
    await savedButton.first().click();
    await expect(page).toHaveURL(new RegExp(`/c/${capsule!.id}`), { timeout: 15_000 });
  });
});

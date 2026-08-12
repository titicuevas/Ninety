import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  API_BASE,
  DEMO_USERNAME,
  openAuthenticatedHome,
  readAccessToken,
} from '../helpers/auth';

async function readSessionUserId(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('ninety.session:v1') ?? localStorage.getItem('ninety.session');
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as { user?: { id?: string } };
      return session.user?.id ?? null;
    } catch {
      return null;
    }
  });
}

/** Perfil completo + follow para salir de «Primeros pasos» (value onboarding solo tras core). */
async function forceCoreComplete(page: Page, userId: string) {
  await page.route('**/api/profile/me', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const res = await route.fetch();
    const body = (await res.json()) as {
      display_name?: string | null;
      username?: string | null;
      [key: string]: unknown;
    };
    const username = body.username ?? '';
    const auto = /^user_[a-f0-9]{8}$/i.test(username);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...body,
        display_name:
          typeof body.display_name === 'string' && body.display_name.length >= 2
            ? body.display_name
            : 'QA Demo',
        username: auto || !username ? 'qa_e2e_demo' : username,
      }),
    });
  });

  await page.route('**/api/profile/*/following**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: [{ username: 'rival_e2e', display_name: 'Rival E2E' }],
        total: 1,
        kind: 'following',
        username: 'qa_e2e_demo',
      }),
    });
  });

  await page.route('**/api/capsules/me**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        capsules: [
          {
            id: 'value-core-capsule',
            user_id: userId,
            match_id: 9201,
            match_played_at: '2026-01-10T12:00:00.000Z',
            home_team_name: 'Betis',
            away_team_name: 'Sevilla',
            home_team_crest: null,
            away_team_crest: null,
            competition_name: 'La Liga',
            home_score: 1,
            away_score: 0,
            watched_at: '2026-01-10',
            rating: 4,
            note: null,
            photo_urls: [],
            is_public: true,
            created_at: '2026-01-10T12:00:00.000Z',
            updated_at: '2026-01-10T12:00:00.000Z',
          },
        ],
        total: 1,
      }),
    });
  });
}

async function resolveCompareUsername(
  request: APIRequestContext,
  token: string,
  meUsername: string,
): Promise<string> {
  const me = meUsername.toLowerCase();

  if (DEMO_USERNAME.toLowerCase() !== me) {
    const demoRes = await request.get(
      `${API_BASE}/api/capsules/user/${encodeURIComponent(DEMO_USERNAME)}?limit=1`,
    );
    if (demoRes.ok()) return DEMO_USERNAME;
  }

  const discoverRes = await request.get(`${API_BASE}/api/profile/discover?limit=12`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(discoverRes.ok()).toBeTruthy();
  const discover = (await discoverRes.json()) as {
    profiles?: Array<{ username?: string | null }>;
  };
  const pick = (list: Array<{ username?: string | null }> | undefined, allowAuto: boolean) =>
    (list ?? []).find(
      (p) =>
        p.username &&
        p.username.toLowerCase() !== me &&
        (allowAuto || !/^user_/i.test(p.username)),
    )?.username ?? null;

  const fromDiscover = pick(discover.profiles, false) ?? pick(discover.profiles, true);
  if (fromDiscover) return fromDiscover;

  // q mínimo 2 caracteres (API search)
  for (const q of ['af', 'demo', 'user', 'ninety', 'madrid', 'betis']) {
    const searchRes = await request.get(
      `${API_BASE}/api/profile/search?q=${encodeURIComponent(q)}&limit=30`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!searchRes.ok()) continue;
    const search = (await searchRes.json()) as {
      profiles?: Array<{ username?: string | null }>;
    };
    const fromSearch = pick(search.profiles, false) ?? pick(search.profiles, true);
    if (fromSearch) return fromSearch;
  }

  expect(
    false,
    'Sin segundo usuario para cara a cara — ejecuta npm run seed:demo',
  ).toBeTruthy();
  return '';
}

test.describe('Smoke — onboarding de valor @smoke', () => {
  test('card Saca más partido aparece tras core y enlaza colección / compare', async ({
    page,
  }) => {
    await openAuthenticatedHome(page);
    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();

    await page.evaluate((id) => {
      localStorage.setItem(`ninety.valueOnboarding:v1:${id}`, JSON.stringify({}));
    }, userId!);

    await forceCoreComplete(page, userId!);

    await page.route('**/api/collections/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ collections: [] }),
      });
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: /primeros pasos/i })).toHaveCount(0);

    const card = page.getByTestId('value-onboarding-card');
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByRole('heading', { name: /saca más partido/i })).toBeVisible();
    await expect(card.getByText(/crea tu primera colección/i)).toBeVisible();
    await expect(card.getByText(/prueba un cara a cara/i )).toBeVisible();

    await card.getByRole('link', { name: /crea tu primera colección/i }).click();
    await expect(page).toHaveURL(/\/collections(\?new=1)?/);
    await expect(page.getByRole('heading', { name: /^mis listas$/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel(/^nombre$/i)).toBeVisible({ timeout: 10_000 });
  });

  test('dismiss permanente oculta la card de valor', async ({ page }) => {
    await openAuthenticatedHome(page);
    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();

    await page.evaluate((id) => {
      localStorage.setItem(`ninety.valueOnboarding:v1:${id}`, JSON.stringify({}));
    }, userId!);

    await forceCoreComplete(page, userId!);

    await page.route('**/api/collections/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ collections: [] }),
      });
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: /primeros pasos/i })).toHaveCount(0);

    const card = page.getByTestId('value-onboarding-card');
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.getByRole('button', { name: /no volver a mostrar/i }).click();
    await expect(card).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('value-onboarding-card')).toHaveCount(0);
  });

  test('atajo vs en gente y marca compare visitado', async ({ page, request }) => {
    await openAuthenticatedHome(page);

    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const meRes = await request.get(`${API_BASE}/api/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.ok()).toBeTruthy();
    const me = (await meRes.json()) as { username?: string | null };
    const meUsername = (me.username ?? '').toLowerCase();

    await page.goto('/search?tab=people');
    await expect(page.getByRole('heading', { name: /^buscar$/i })).toBeVisible();

    const vsLink = page.getByRole('link', { name: /cara a cara con @/i }).first();
    const suggestions = page.getByRole('heading', { name: /aficionados sugeridos/i });
    const emptyHint = page.getByText(/encuentra aficionados/i);
    await expect(suggestions.or(emptyHint).or(vsLink)).toBeVisible({ timeout: 20_000 });

    let targetUsername: string | null = null;
    if (await vsLink.isVisible().catch(() => false)) {
      await expect(vsLink).toHaveAttribute('href', /\/u\/[^/]+\/vs$/);
      const href = await vsLink.getAttribute('href');
      targetUsername = href?.match(/\/u\/([^/]+)\/vs/)?.[1] ?? null;
      expect(targetUsername).toBeTruthy();
      await vsLink.click();
    } else {
      targetUsername = await resolveCompareUsername(request, token!, meUsername);
      await page.goto(`/u/${encodeURIComponent(targetUsername)}/vs`);
    }

    await expect(page).toHaveURL(/\/u\/[^/]+\/vs/);
    await expect(page.getByTestId('compare-face-off')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('compare-bar-matches')).toBeVisible();
    await expect(
      page.getByTestId('compare-shared-teams').or(page.getByTestId('compare-shared-teams-empty')),
    ).toBeVisible();

    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();
    await expect
      .poll(async () => {
        return page.evaluate((id) => {
          const raw = localStorage.getItem(`ninety.valueOnboarding:v1:${id}`);
          if (!raw) return null;
          try {
            return (JSON.parse(raw) as { compareVisitedAt?: string }).compareVisitedAt ?? null;
          } catch {
            return null;
          }
        }, userId!);
      })
      .toBeTruthy();
  });
});

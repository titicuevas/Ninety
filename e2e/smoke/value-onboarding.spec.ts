import { expect, test } from '@playwright/test';
import { API_BASE, openAuthenticatedHome, readAccessToken } from '../helpers/auth';

async function readSessionUserId(page: import('@playwright/test').Page) {
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

test.describe('Smoke — onboarding de valor @smoke', () => {
  test('card Saca más partido aparece tras core y enlaza colección / compare', async ({
    page,
  }) => {
    await openAuthenticatedHome(page);
    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();

    // Forzar estado: core hecho + pasos de valor pendientes + sin dismiss
    await page.evaluate((id) => {
      localStorage.setItem(`ninety.valueOnboarding:v1:${id}`, JSON.stringify({}));
    }, userId!);

    // Simular colecciones vacías para que el paso de colección quede pendiente
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

    const onboardingCore = page.getByRole('heading', { name: /primeros pasos/i });
    if (await onboardingCore.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'note',
        description: 'Onboarding core aún activo en esta cuenta demo — card de valor no aplica',
      });
      return;
    }

    const card = page.getByTestId('value-onboarding-card');
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByRole('heading', { name: /saca más partido/i })).toBeVisible();
    await expect(card.getByText(/crea tu primera colección/i)).toBeVisible();
    await expect(card.getByText(/prueba un cara a cara/i)).toBeVisible();

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

    const onboardingCore = page.getByRole('heading', { name: /primeros pasos/i });
    if (await onboardingCore.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'note',
        description: 'Onboarding core aún activo — skip dismiss de valor',
      });
      return;
    }

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
      await vsLink.click();
    } else {
      const discoverRes = await request.get(`${API_BASE}/api/profile/discover?limit=12`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(discoverRes.ok()).toBeTruthy();
      const discover = (await discoverRes.json()) as {
        profiles?: Array<{ username?: string | null }>;
      };
      const rival = (discover.profiles ?? []).find(
        (p) =>
          p.username &&
          !/^user_/i.test(p.username) &&
          p.username.toLowerCase() !== meUsername,
      );
      test.skip(!rival?.username, 'Sin rival comparable en discover para cara a cara');
      targetUsername = rival!.username!;
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

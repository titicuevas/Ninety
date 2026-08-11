import { expect, test } from '@playwright/test';
import {
  API_BASE,
  DEMO_USERNAME,
  demoDisplayName,
  escapeRegExp,
  requirePublicDemoProfile,
} from '../helpers/auth';

test.describe('Crítico — perfiles públicos @critical', () => {
  test('perfil y capsule públicos sin login', async ({ page, request }) => {
    const data = await requirePublicDemoProfile(request);
    const name = demoDisplayName(data);

    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { name: new RegExp(escapeRegExp(name), 'i') })).toBeVisible({
      timeout: 20_000,
    });

    const firstMatch = page.locator('main a[href^="/c/"]').first();
    test.skip(!(await firstMatch.isVisible().catch(() => false)), 'El demo no tiene Capsules públicas');

    await Promise.all([page.waitForURL(/\/c\/[0-9a-f-]+/i), firstMatch.click()]);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compartir Capsule' })).toHaveCount(1);
  });

  test('listas de seguidores y siguiendo se abren', async ({ page, request }) => {
    const data = await requirePublicDemoProfile(request);
    const name = demoDisplayName(data);

    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { name: new RegExp(escapeRegExp(name), 'i') })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('link', { name: /seguidores/i }).click();
    await expect(page).toHaveURL(/\/followers/);
    await expect(page.getByRole('heading', { name: /seguidores/i })).toBeVisible();
    await expect(page.getByText(/\d+ aficionados?/i)).toBeVisible();

    const loadMore = page.getByRole('button', { name: /cargar más/i });
    if (await loadMore.isVisible().catch(() => false)) {
      await expect(loadMore).toBeEnabled();
    }

    await page.getByRole('tab', { name: 'Siguiendo' }).click();
    await expect(page).toHaveURL(/\/following/);
    await expect(page.getByRole('heading', { name: /siguiendo/i })).toBeVisible();

    const res = await request.get(
      `${API_BASE}/api/profile/${DEMO_USERNAME}/followers?limit=5&offset=0`,
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      profiles?: Array<{ followed_by_me?: boolean; follows_me?: boolean }>;
      total?: number;
    };
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(body.profiles!.length).toBeLessThanOrEqual(5);
    expect(typeof body.total).toBe('number');
    for (const profile of body.profiles ?? []) {
      expect(typeof profile.followed_by_me).toBe('boolean');
      expect(typeof profile.follows_me).toBe('boolean');
    }
  });
});

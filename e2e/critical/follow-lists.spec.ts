import { expect, test } from '@playwright/test';
import { API_BASE, DEMO_USERNAME } from '../helpers/auth';

test.describe('Crítico — perfiles públicos @critical', () => {
  test('perfil y capsule públicos sin login', async ({ page }) => {
    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { name: /beta ninety/i })).toBeVisible({
      timeout: 20_000,
    });

    const firstMatch = page.locator('main a[href^="/c/"]').first();
    await expect(firstMatch).toBeVisible({ timeout: 15_000 });
    await Promise.all([page.waitForURL(/\/c\/[0-9a-f-]+/i), firstMatch.click()]);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compartir Capsule' })).toHaveCount(1);
  });

  test('listas de seguidores y siguiendo se abren', async ({ page, request }) => {
    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { name: /beta ninety/i })).toBeVisible({
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
    const body = (await res.json()) as { profiles?: unknown[]; total?: number };
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(body.profiles!.length).toBeLessThanOrEqual(5);
    expect(typeof body.total).toBe('number');
  });
});

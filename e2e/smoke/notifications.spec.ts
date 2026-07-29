import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Smoke — notificaciones @smoke', () => {
  test('página de notificaciones accesible desde la campanita', async ({ page }) => {
    await openAuthenticatedHome(page);

    const bell = page.getByRole('link', { name: /notificaciones/i }).first();
    await expect(bell).toBeVisible({ timeout: 10_000 });
    await bell.click();

    await expect(page).toHaveURL(/\/notifications/);
    await expect(
      page.getByRole('heading', { name: /notificaciones/i }),
    ).toBeVisible();
  });

  test('muestra estado vacío o lista de notificaciones', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/notifications');
    await page.waitForURL(/\/notifications/);

    const empty = page.getByText(/sin notificaciones/i);
    const list = page.locator('[class*="divide-"]');

    await expect(empty.or(list)).toBeVisible({ timeout: 15_000 });
  });
});

import { expect, test } from '@playwright/test';

test.describe('Smoke — autenticado @smoke', () => {
  test('home muestra Wrapped o empty state', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/home/);
    await expect(
      page.getByRole('heading', { name: /esto es tu fútbol|tu wrapped empieza/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('feed accesible desde la app', async ({ page }) => {
    await page.goto('/home');
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /feed/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();
  });
});

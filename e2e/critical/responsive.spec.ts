import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

/**
 * Regresión de shell responsive:
 * - móvil / tablet (<1024): tab bar inferior
 * - desktop (≥1024): nav en header
 */
test.describe('Responsive shell @critical @mobile @tablet', () => {
  test('muestra tab bar en viewport estrecho', async ({ page }) => {
    await openAuthenticatedHome(page);

    const navs = page.getByRole('navigation', { name: /navegación principal/i });
    await expect(navs).toHaveCount(1);

    // Tab bar fija al fondo
    const box = await navs.boundingBox();
    expect(box).toBeTruthy();
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    expect(box!.y + box!.height).toBeGreaterThan((viewport!.height * 3) / 4);

    await expect(navs.getByRole('link', { name: /alertas|notificaciones/i })).toBeVisible();
    await navs.getByRole('link', { name: /buscar/i }).click();
    await expect(page).toHaveURL(/\/search/);
  });

  test('home Wrapped no desborda en horizontal', async ({ page }) => {
    await openAuthenticatedHome(page);
    await expect(
      page.getByRole('heading', { name: /esto es tu fútbol|tu wrapped empieza/i }),
    ).toBeVisible({ timeout: 20_000 });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});

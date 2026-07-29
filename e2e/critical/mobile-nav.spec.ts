import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Crítico — navegación móvil @critical @mobile', () => {
  test('tab bar inferior navega entre Inicio y Feed', async ({ page }) => {
    await openAuthenticatedHome(page);

    const tabBar = page.getByRole('navigation', { name: /navegación principal/i });
    await expect(tabBar).toBeVisible();

    // En Pixel 5 la nav es la tab bar fija (único nav principal visible).
    await tabBar.getByRole('link', { name: /feed/i }).click();
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();

    await tabBar.getByRole('link', { name: /inicio/i }).click();
    await expect(page).toHaveURL(/\/home/);
  });

  test('buscar desde tab bar abre Aficionados', async ({ page }) => {
    await openAuthenticatedHome(page);
    const tabBar = page.getByRole('navigation', { name: /navegación principal/i });
    await tabBar.getByRole('link', { name: /buscar/i }).click();
    await expect(page).toHaveURL(/\/search/);
    await page.getByRole('tab', { name: 'Aficionados' }).click();
    await expect(page.getByText(/encuentra aficionados/i)).toBeVisible();
  });
});

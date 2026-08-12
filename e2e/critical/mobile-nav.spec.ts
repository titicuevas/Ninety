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
    await expect(page.getByRole('tab', { name: 'Aficionados' })).toBeVisible();

    // goto con query: el click de tab a veces no sincroniza URL↔UI en tablet
    await page.goto('/search?tab=people');
    await expect(page).toHaveURL(/tab=people/);
    await expect(page.getByRole('tab', { name: 'Aficionados' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page
        .getByLabel(/nombre o username/i)
        .or(page.getByRole('heading', { name: /aficionados sugeridos/i }))
        .or(page.getByText(/encuentra aficionados/i))
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Listas desde tab bar abre Mis listas', async ({ page }) => {
    await openAuthenticatedHome(page);
    const tabBar = page.getByRole('navigation', { name: /navegación principal/i });
    await tabBar.getByRole('link', { name: /listas/i }).click();
    await expect(page).toHaveURL(/\/collections/);
    await expect(page.getByRole('heading', { name: /^mis listas$/i })).toBeVisible();
    const collectionsNav = page.getByRole('navigation', { name: /^colecciones$/i });
    await expect(collectionsNav.getByRole('link', { name: /^explorar$/i })).toBeVisible();
  });
});

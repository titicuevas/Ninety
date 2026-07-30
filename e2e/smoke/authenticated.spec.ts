import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Smoke — autenticado @smoke', () => {
  test('home muestra Wrapped o empty state', async ({ page }) => {
    await openAuthenticatedHome(page);
    await expect(
      page.getByRole('heading', { name: /esto es tu fútbol|tu wrapped empieza/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('Wrapped permite cambiar periodo y compartir', async ({ page }) => {
    await openAuthenticatedHome(page);
    const wrappedHeading = page.getByRole('heading', { name: /esto es tu fútbol/i });
    const empty = page.getByRole('heading', { name: /tu wrapped empieza/i });
    await expect(wrappedHeading.or(empty)).toBeVisible({ timeout: 20_000 });

    if (await empty.isVisible().catch(() => false)) return;

    const tabs = page.getByRole('tablist', { name: /periodo del wrapped/i });
    await expect(tabs).toBeVisible();
    const allTab = tabs.getByRole('tab', { name: /^todo$/i });
    await allTab.click();
    await expect(page).toHaveURL(/wrapped=all/);
    await expect(page.getByRole('button', { name: /compartir|copiado/i })).toBeVisible();
    await page.getByRole('button', { name: /compartir|copiado/i }).click();
    // Sin Web Share en Chromium headless suele copiar al clipboard; el botón no debe romper
    await expect(page.getByRole('button', { name: /compartir|copiado/i })).toBeVisible();
  });

  test('feed accesible desde la app', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /feed/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();
  });

  test('perfil editable muestra campo bio', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /perfil/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /tu perfil/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel(/^bio$/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /subir foto|cambiar foto/i }),
    ).toBeVisible();
  });
});

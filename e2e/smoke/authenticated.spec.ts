import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Smoke — autenticado @smoke', () => {
  test('home muestra Wrapped o empty state', async ({ page }) => {
    await openAuthenticatedHome(page);
    await expect(
      page.getByRole('heading', { name: /esto es tu fútbol|tu wrapped empieza/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('home muestra hub Comunidad con atajos', async ({ page }) => {
    await openAuthenticatedHome(page);
    await expect(page.getByRole('heading', { name: /^comunidad$/i })).toBeVisible({
      timeout: 20_000,
    });
    const shortcuts = page.getByRole('navigation', { name: /atajos sociales/i });
    await expect(shortcuts.getByRole('link', { name: /^feed$/i })).toBeVisible();
    await expect(shortcuts.getByRole('link', { name: /aficionados/i })).toBeVisible();
    await expect(shortcuts.getByRole('link', { name: /notificaciones/i })).toBeVisible();
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

  test('Buscar partidos muestra chips de temporada', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /buscar/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('heading', { name: /^buscar$/i })).toBeVisible();

    await page.getByLabel(/equipo o rival/i).fill('Betis');
    await expect(page.getByRole('group', { name: /temporada/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /^cualquiera$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /esta temporada/i })).toBeVisible();

    await page.getByRole('button', { name: /esta temporada/i }).click();
    await expect(page).toHaveURL(/season=/);
  });

  test('Buscar partidos ofrece atajo de equipo favorito o perfil', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /buscar/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText(/qué partido viste/i)).toBeVisible({
      timeout: 15_000,
    });

    const favoriteShortcut = page.getByRole('button', { name: /^buscar /i });
    const profileLink = page.getByRole('link', { name: /añadir equipo favorito/i });

    await expect(favoriteShortcut.or(profileLink)).toBeVisible();

    if (await favoriteShortcut.isVisible()) {
      await favoriteShortcut.click();
      await expect(page).toHaveURL(/\bq=/);
      await expect(page.getByLabel(/equipo o rival/i)).not.toHaveValue('');
      await expect(
        page
          .getByRole('status', { name: /buscando partidos/i })
          .or(page.locator('ul li').first())
          .or(page.getByText(/sin resultados/i))
          .or(page.getByRole('group', { name: /temporada/i })),
      ).toBeVisible({ timeout: 20_000 });
    }
  });

  test('Buscar aficionados muestra sugerencias o empty', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /buscar/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/search/);

    await page.getByRole('tab', { name: 'Aficionados' }).click();
    await expect(page).toHaveURL(/tab=people/);

    const suggestions = page.getByRole('heading', { name: /aficionados sugeridos/i });
    const emptyHint = page.getByText(/encuentra aficionados/i);
    await expect(suggestions.or(emptyHint)).toBeVisible({ timeout: 15_000 });
  });
});

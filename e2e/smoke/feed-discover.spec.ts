import { expect, test } from '@playwright/test';
import { API_BASE, goAppNav, openAuthenticatedHome, readAccessToken } from '../helpers/auth';

test.describe('Smoke — feed y discover @smoke', () => {
  test('feed accesible con orden o empty state', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /feed/i);

    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();

    const recentTab = page.getByRole('tab', { name: /recientes/i });
    const empty = page.getByText(/tu feed está vacío/i);

    await expect(recentTab.or(empty)).toBeVisible({ timeout: 15_000 });

    if (await recentTab.isVisible()) {
      const loadMore = page.getByRole('button', { name: /cargar más/i });
      if (await loadMore.isVisible()) {
        await expect(loadMore).toBeEnabled();
      }
    }
  });

  test('si el feed está vacío, muestra sugerencias o CTA de búsqueda', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /feed/i);
    await expect(page).toHaveURL(/\/feed/);

    const empty = page.getByText(/tu feed está vacío/i);
    const hasContent = page.getByRole('tab', { name: /recientes/i });

    // Esperar a que cargue uno u otro
    await expect(empty.or(hasContent)).toBeVisible({ timeout: 15_000 });

    if (await empty.isVisible()) {
      await expect(page.getByRole('link', { name: /buscar aficionados/i })).toBeVisible();

      const suggestions = page.getByRole('heading', { name: /aficionados sugeridos/i });
      // Las sugerencias dependen de que haya otros perfiles; si no hay, solo el CTA
      if (await suggestions.isVisible()) {
        await expect(page.getByRole('button', { name: /^seguir$/i }).first()).toBeVisible();
      }
    }
  });

  test('Mis Capsules accesible con lista, empty o cargar más', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /capsules/i);

    await expect(page).toHaveURL(/\/capsules/);
    await expect(page.getByRole('heading', { name: /mis capsules/i })).toBeVisible();
    await expect(page.getByLabel(/buscar en tus capsules/i)).toBeVisible();
    await expect(page.getByRole('group', { name: /filtrar por valoración/i })).toBeVisible();

    const empty = page.getByText(/aún no tienes capsules/i);
    const listItem = page.locator('ul li').first();
    const loadMore = page.getByRole('button', { name: /cargar más/i });
    const filterEmpty = page.getByText(/ningún partido con estos filtros/i);

    await expect(empty.or(listItem).or(loadMore).or(filterEmpty)).toBeVisible({ timeout: 15_000 });
  });

  test('API Mis Capsules acepta filtros de diario', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/api/capsules/me?limit=5&offset=0&rating_min=4&visibility=all`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { capsules?: unknown[]; total?: number };
    expect(Array.isArray(body.capsules)).toBe(true);
    expect(body.capsules!.length).toBeLessThanOrEqual(5);
    expect(typeof body.total).toBe('number');
  });
});

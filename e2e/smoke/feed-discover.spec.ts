import { expect, test } from '@playwright/test';
import { goAppNav, openAuthenticatedHome } from '../helpers/auth';

test.describe('Smoke — feed y discover @smoke', () => {
  test('feed accesible con orden o empty state', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /feed/i);

    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();

    const recentTab = page.getByRole('tab', { name: /recientes/i });
    const empty = page.getByText(/tu feed está vacío/i);

    await expect(recentTab.or(empty)).toBeVisible({ timeout: 15_000 });
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
});

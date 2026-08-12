import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Responsive shell desktop @critical', () => {
  test('usa nav de header y no tab bar inferior', async ({ page }) => {
    await openAuthenticatedHome(page);

    const nav = page.getByRole('navigation', { name: /navegación principal/i });
    await expect(nav).toHaveCount(1);

    const box = await nav.boundingBox();
    expect(box).toBeTruthy();
    // Header arriba
    expect(box!.y).toBeLessThan(120);

    await nav.getByRole('link', { name: /listas/i }).click();
    await expect(page).toHaveURL(/\/collections/);
    await expect(page.getByRole('heading', { name: /^mis listas$/i })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /^colecciones$/i })).toBeVisible();
  });
});

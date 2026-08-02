import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Smoke — colecciones @smoke', () => {
  test('Mis Capsules enlaza a Colecciones y se puede crear una lista', async ({ page }) => {
    await openAuthenticatedHome(page);

    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /capsules/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/capsules/);
    await expect(page.getByRole('heading', { name: /mis capsules/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('link', { name: /^colecciones$/i }).click();
    await expect(page).toHaveURL(/\/collections/);
    await expect(page.getByRole('heading', { name: /^colecciones$/i })).toBeVisible({
      timeout: 20_000,
    });

    const uniqueName = `E2E ${Date.now()}`;
    await page.getByRole('button', { name: /nueva colección|crear la primera/i }).first().click();
    await page.getByLabel(/^nombre$/i).fill(uniqueName);
    await page.getByRole('button', { name: /^crear$/i }).click();

    await expect(page).toHaveURL(/\/collections\/[0-9a-f-]+/i, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /editar colección/i })).toBeVisible();
    await expect(page.getByDisplayValue(uniqueName)).toBeVisible();

    const publicLink = page.getByRole('link', { name: /ver pública/i });
    await expect(publicLink).toBeVisible({ timeout: 10_000 });
    const href = await publicLink.getAttribute('href');
    expect(href).toMatch(/\/u\/[^/]+\/lists\/[^/]+/);

    await publicLink.click();
    await expect(page).toHaveURL(/\/u\/[^/]+\/lists\/[^/]+/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: new RegExp(uniqueName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('button', { name: /compartir/i })).toBeVisible();
  });

  test('Perfil enlaza a Colecciones', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /perfil/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /tu perfil/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('link', { name: /^colecciones$/i }).click();
    await expect(page).toHaveURL(/\/collections/);
    await expect(page.getByRole('heading', { name: /^colecciones$/i })).toBeVisible();
  });
});

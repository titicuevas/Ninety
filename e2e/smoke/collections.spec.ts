import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';
import { deleteOwnE2eCollections } from '../helpers/e2eCollections';

test.describe('Smoke — colecciones @smoke', () => {
  test.afterEach(async ({ page, request }) => {
    await deleteOwnE2eCollections(page, request);
  });
  test('Listas en nav principal abre Mis listas y Explorar', async ({ page }) => {
    await openAuthenticatedHome(page);

    const mainNav = page.getByRole('navigation', { name: /navegación principal/i });
    await mainNav.getByRole('link', { name: /listas/i }).first().click();
    await expect(page).toHaveURL(/\/collections$/);
    await expect(page.getByRole('heading', { name: /^mis listas$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('#main-content')).toBeVisible();

    const collectionsNav = page.getByRole('navigation', { name: /^colecciones$/i });
    await expect(collectionsNav).toBeVisible();
    await collectionsNav.getByRole('link', { name: /^explorar$/i }).click();
    await expect(page).toHaveURL(/\/collections\/explore/);
    await expect(page.getByRole('heading', { name: /explorar colecciones/i })).toBeVisible({
      timeout: 20_000,
    });

    await expect(page.getByTestId('explore-collections-sort')).toBeVisible();
    await page.getByRole('button', { name: /^recientes$/i }).click();
    await expect(page).toHaveURL(/sort=recent/);
    await page.getByRole('button', { name: /^me gusta$/i }).click();
    await expect(page).toHaveURL(/sort=likes/);
    await page.getByRole('button', { name: /^relevantes$/i }).click();
    await expect(page).not.toHaveURL(/sort=/);

    await collectionsNav.getByRole('link', { name: /^me gusta$/i }).click();
    await expect(page).toHaveURL(/\/collections\/likes/);
    await expect(page.getByRole('heading', { name: /listas que te gustaron/i })).toBeVisible({
      timeout: 20_000,
    });

    await collectionsNav.getByRole('link', { name: /mis listas/i }).click();
    await expect(page).toHaveURL(/\/collections$/);
  });

  test('Se puede crear una lista desde Mis listas', async ({ page }) => {
    await openAuthenticatedHome(page);

    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /listas/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/collections$/);
    await expect(page.getByRole('heading', { name: /^mis listas$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('#main-content')).toBeVisible();

    const uniqueName = `E2E ${Date.now()}`;
    const newBtn = page.getByRole('button', { name: /nueva colección|crear la primera/i }).first();
    await newBtn.click();
    await expect(newBtn).toHaveAttribute('aria-expanded', 'true');
    await page.getByLabel(/^nombre$/i).fill(uniqueName);
    await page.getByRole('button', { name: /^crear$/i }).click();

    await expect(page).toHaveURL(/\/collections\/[0-9a-f-]+/i, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /editar colección/i })).toBeVisible();
    await expect(page.getByLabel(/^nombre$/i)).toHaveValue(uniqueName);

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

  test('Lista pública muestra follows que también le dieron me gusta', async ({ page }) => {
    await openAuthenticatedHome(page);

    await page.route('**/api/collections/*/likes/following', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          people: [
            {
              id: 'e2e-friend',
              username: 'amigo_e2e',
              display_name: 'Amigo E2E',
              avatar_url: null,
            },
          ],
          total: 1,
        },
      });
    });

    await page.route('**/api/collections/*/comments/following', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          people: [
            {
              id: 'e2e-commenter',
              username: 'comentarista_e2e',
              display_name: 'Comentarista E2E',
              avatar_url: null,
            },
          ],
          total: 1,
        },
      });
    });

    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /listas/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/collections$/);

    const uniqueName = `E2E likes ${Date.now()}`;
    const newBtn = page.getByRole('button', { name: /nueva colección|crear la primera/i }).first();
    await newBtn.click();
    await page.getByLabel(/^nombre$/i).fill(uniqueName);
    await page.getByRole('button', { name: /^crear$/i }).click();
    await expect(page).toHaveURL(/\/collections\/[0-9a-f-]+/i, { timeout: 20_000 });

    await expect(page.getByText(/también le gusta/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: /amigo e2e/i })).toBeVisible();
    await expect(page.getByText(/también comentó/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /comentarista e2e/i })).toBeVisible();

    await page.getByRole('link', { name: /ver pública/i }).click();
    await expect(page).toHaveURL(/\/u\/[^/]+\/lists\/[^/]+/, { timeout: 15_000 });
    await expect(page.getByText(/también le gusta/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /amigo e2e/i })).toBeVisible();
    await expect(page.getByText(/también comentó/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /comentarista e2e/i })).toBeVisible();
  });

  test('Perfil y Listas en nav abren Mis listas', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /perfil/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /tu perfil/i })).toBeVisible({ timeout: 20_000 });

    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /listas/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/collections/);
    await expect(page.getByRole('heading', { name: /^mis listas$/i })).toBeVisible();
  });
});

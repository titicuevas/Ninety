import { expect, test } from '@playwright/test';
import { expectFocusInsideOpenDialog, expectNoA11yViolations } from '../helpers/a11y';
import {
  DEMO_USERNAME,
  goAppNav,
  openAuthenticatedHome,
  requirePublicDemoProfile,
} from '../helpers/auth';

test.describe('A11y — app autenticada @a11y', () => {
  test('home sin violaciones graves', async ({ page }) => {
    await openAuthenticatedHome(page);
    await expectNoA11yViolations(page, 'home');
  });

  test('feed sin violaciones graves', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /feed/i);
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();
    await expectNoA11yViolations(page, 'feed');
  });

  test('Capsule pública sin violaciones graves', async ({ page, request }) => {
    const data = await requirePublicDemoProfile(request);
    const capsuleId = data.capsules?.[0]?.id;
    if (!capsuleId) {
      test.skip(true, `El perfil @${DEMO_USERNAME} no tiene Capsules públicas`);
      return;
    }

    await openAuthenticatedHome(page);
    await page.goto(`/c/${capsuleId}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expectNoA11yViolations(page, 'capsule');
  });

  test('Mis listas sin violaciones graves', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /listas/i);
    await expect(page).toHaveURL(/\/collections$/);
    await expect(page.getByRole('heading', { name: /^mis listas$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expectNoA11yViolations(page, 'collections');
  });

  test('Quiero ir sin violaciones graves', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/want-to-go');
    await expect(page.getByRole('heading', { name: /^quiero ir$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expectNoA11yViolations(page, 'want-to-go');
  });

  test('confirmar eliminar: foco al abrir, Esc y restauración', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /capsules/i);
    await expect(page).toHaveURL(/\/capsules/);

    const deleteBtn = page.getByRole('button', { name: /^eliminar$/i }).first();
    const empty = page.getByText(/aún no tienes capsules/i);
    await expect(deleteBtn.or(empty)).toBeVisible({ timeout: 20_000 });
    if (await empty.isVisible().catch(() => false)) return;

    await deleteBtn.focus();
    await expect(deleteBtn).toBeFocused();
    await deleteBtn.press('Enter');

    const dialog = page.getByRole('dialog', { name: /eliminar esta capsule/i });
    await expect(dialog).toBeVisible();
    await expectFocusInsideOpenDialog(page);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(deleteBtn).toBeFocused();
  });

  test('chips de Explorar se activan con teclado', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/collections/explore');
    await expect(page.getByRole('heading', { name: /explorar colecciones/i })).toBeVisible({
      timeout: 20_000,
    });

    const sort = page.getByTestId('explore-collections-sort');
    const recent = sort.getByRole('button', { name: /^recientes$/i });
    await recent.focus();
    await expect(recent).toBeFocused();
    await recent.press('Enter');
    await expect(recent).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/sort=recent/);
  });
});

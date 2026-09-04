import { expect, test } from '@playwright/test';
import { expectFocusInsideOpenDialog, expectNoA11yViolations } from '../helpers/a11y';
import {
  DEMO_USERNAME,
  goAppNav,
  openAuthenticatedHome,
  requirePublicDemoProfile,
} from '../helpers/auth';

test.describe('A11y — app autenticada @a11y', () => {
  test('home cumple WCAG A/AA', async ({ page }) => {
    await openAuthenticatedHome(page);
    await expectNoA11yViolations(page, 'home');
  });

  test('feed cumple WCAG A/AA', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /feed/i);
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();
    await expectNoA11yViolations(page, 'feed');
  });

  test('Capsule pública cumple WCAG A/AA', async ({ page, request }) => {
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

  test('Mis listas cumple WCAG A/AA', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /listas/i);
    await expect(page).toHaveURL(/\/collections$/);
    await expect(page.getByRole('heading', { name: /^mis listas$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expectNoA11yViolations(page, 'collections');
  });

  test('Quiero ir cumple WCAG A/AA', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/want-to-go');
    await expect(page.getByRole('heading', { name: /^quiero ir$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expectNoA11yViolations(page, 'want-to-go');
  });

  for (const view of [
    { path: '/activity', heading: /^actividad$/i, label: 'activity' },
    { path: '/search', heading: /^buscar$/i, label: 'search' },
    { path: '/search/manual', heading: /^partido manual$/i, label: 'manual-match' },
    { path: '/capsules', heading: /^mis capsules$/i, label: 'capsules' },
    { path: '/likes', heading: /^me gusta$/i, label: 'likes' },
    { path: '/diary/calendar', heading: /^calendario$/i, label: 'calendar' },
    { path: '/collections/explore', heading: /explorar colecciones/i, label: 'explore-collections' },
    { path: '/collections/likes', heading: /listas que te gustan/i, label: 'liked-collections' },
    { path: '/notifications', heading: /^notificaciones$/i, label: 'notifications' },
    { path: '/profile', heading: /perfil/i, label: 'profile' },
    { path: '/settings', heading: /ajustes/i, label: 'settings' },
  ]) {
    test(`${view.label} cumple WCAG A/AA`, async ({ page }) => {
      await openAuthenticatedHome(page);
      await page.goto(view.path);
      const ready =
        view.label === 'liked-collections'
          ? page.locator('#liked-collections-heading')
          : page.getByRole('heading', { level: 1, name: view.heading }).first();
      await expect(ready).toBeVisible({ timeout: 30_000 });
      await expectNoA11yViolations(page, view.label);
    });
  }

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

  test('chips de aficionados se activan con teclado', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/search?tab=people');
    await expect(page.getByRole('heading', { name: /^buscar$/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByLabel(/nombre o username/i)).toBeVisible({ timeout: 15_000 });

    const filters = page.getByTestId('people-discover-filters');
    test.skip(
      (await filters.count()) === 0,
      'front aún no tiene chips de discover — espera al deploy de v68',
    );
    const nearby = filters.getByRole('button', { name: /^cerca$/i });
    await nearby.focus();
    await expect(nearby).toBeFocused();
    await nearby.press('Enter');
    await expect(nearby).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/reason=nearby/);
  });

  test('chips de listas en Buscar se activan con teclado', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/search?tab=lists');
    await expect(page.getByRole('heading', { name: /^buscar$/i })).toBeVisible({
      timeout: 20_000,
    });
    const listsTab = page.getByRole('tablist', { name: /tipo de búsqueda/i }).getByRole('tab', {
      name: 'Listas',
    });
    test.skip(
      (await listsTab.count()) === 0,
      'front aún no tiene pestaña Listas — espera al deploy de v71',
    );
    const sort = page.getByTestId('explore-collections-sort');
    const recent = sort.getByRole('button', { name: /^recientes$/i });
    await recent.focus();
    await expect(recent).toBeFocused();
    await recent.press('Enter');
    await expect(recent).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/sort=recent/);
  });

  test('chips de Wrapped público se activan con teclado', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expectNoA11yViolations(page, 'public-profile-authenticated');
    await page.getByRole('tab', { name: /^stats$/i }).click();
    const tabs = page.getByTestId('public-wrapped-scope');
    await expect(tabs).toBeVisible({ timeout: 15_000 });
    const yearTab = tabs.getByRole('tab').nth(1);
    await expect(yearTab, `El perfil @${DEMO_USERNAME} debe tener años en el Wrapped`).toBeVisible();
    await yearTab.focus();
    await expect(yearTab).toBeFocused();
    await yearTab.press('Enter');
    await expect(yearTab).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/wrapped=/);
  });
});

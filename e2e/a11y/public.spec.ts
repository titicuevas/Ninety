import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from '../helpers/a11y';
import {
  DEMO_USERNAME,
  demoDisplayName,
  escapeRegExp,
  requirePublicDemoProfile,
} from '../helpers/auth';

test.describe('A11y — páginas públicas @a11y', () => {
  test('landing cumple WCAG A/AA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /ninety/i })).toBeVisible();
    await expectNoA11yViolations(page, 'landing');
  });

  test('landing: skip link alcanzable con Tab', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /ninety/i })).toBeVisible();
    await page.evaluate(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    });
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: /saltar al contenido/i });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.locator('#main-content')).toBeVisible();
  });

  test('login cumple WCAG A/AA', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
    await expectNoA11yViolations(page, 'login');
  });

  for (const view of [
    { path: '/register', heading: /crea tu cuenta/i, label: 'register' },
    { path: '/forgot-password', heading: /recuperar contraseña/i, label: 'forgot-password' },
    { path: '/auth/reset-password', heading: /nueva contraseña/i, label: 'reset-password' },
    { path: '/privacidad', heading: /política de privacidad/i, label: 'privacy' },
    { path: '/terminos', heading: /términos de uso/i, label: 'terms' },
  ]) {
    test(`${view.label} cumple WCAG A/AA`, async ({ page }) => {
      await page.goto(view.path);
      await expect(page.getByRole('heading', { level: 1, name: view.heading })).toBeVisible();
      await expectNoA11yViolations(page, view.label);
    });
  }

  test('login: skip link alcanza el formulario', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
    // Autofill del navegador puede dejar el foco en el email; volver al documento
    await page.evaluate(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    });
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: /saltar al contenido/i });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('404 y agradecimiento cumplen WCAG A/AA', async ({ page }) => {
    await page.goto('/ruta-que-no-existe');
    await expect(page.getByRole('heading', { name: /fuera de juego/i })).toBeVisible();
    await expectNoA11yViolations(page, '404');

    await page.goto('/gracias');
    await expect(page.getByRole('heading', { level: 1, name: /gracias por registrarte/i })).toBeVisible();
    await expectNoA11yViolations(page, 'agradecimiento');
  });

  test('perfil público cumple WCAG A/AA', async ({ page, request }) => {
    const data = await requirePublicDemoProfile(request);
    const name = demoDisplayName(data);

    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(
      page.getByRole('heading', { level: 1, name: new RegExp(escapeRegExp(name), 'i') }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expectNoA11yViolations(page, 'public-profile');
  });
});

import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from '../helpers/a11y';
import {
  DEMO_USERNAME,
  demoDisplayName,
  escapeRegExp,
  requirePublicDemoProfile,
} from '../helpers/auth';

test.describe('A11y — páginas públicas @a11y', () => {
  test('landing sin violaciones graves', async ({ page }) => {
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

  test('login sin violaciones graves', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
    await expectNoA11yViolations(page, 'login');
  });

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

  test('perfil público sin violaciones graves', async ({ page, request }) => {
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

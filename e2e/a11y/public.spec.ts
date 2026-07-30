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

  test('login sin violaciones graves', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
    await expectNoA11yViolations(page, 'login');
  });

  test('perfil público sin violaciones graves', async ({ page, request }) => {
    const data = await requirePublicDemoProfile(request);
    const name = demoDisplayName(data);

    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { name: new RegExp(escapeRegExp(name), 'i') })).toBeVisible({
      timeout: 20_000,
    });
    await expectNoA11yViolations(page, 'public-profile');
  });
});

import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Smoke — onboarding @smoke', () => {
  test('home muestra pasos de onboarding o wrapped', async ({ page }) => {
    await openAuthenticatedHome(page);

    const onboarding = page.getByRole('heading', { name: /primeros pasos/i });
    const wrapped = page.getByRole('heading', { name: /esto es tu fútbol/i });
    const empty = page.getByRole('heading', { name: /tu wrapped empieza/i });

    await expect(onboarding.or(wrapped).or(empty)).toBeVisible({ timeout: 15_000 });
  });
});

import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Smoke — onboarding @smoke', () => {
  test('post-auth aterriza en home con onboarding o wrapped', async ({ page }) => {
    await openAuthenticatedHome(page);

    await expect(page).toHaveURL(/\/home/);

    const onboarding = page.getByRole('heading', { name: /primeros pasos/i });
    const wrapped = page.getByRole('heading', { name: /esto es tu fútbol/i });
    const empty = page.getByRole('heading', { name: /tu wrapped empieza/i });
    const comunidad = page.getByRole('heading', { name: /^comunidad$/i });

    await expect(onboarding.or(wrapped).or(empty).or(comunidad).first()).toBeVisible({
      timeout: 15_000,
    });

    // No debe ser el formulario de perfil como landing post-auth
    await expect(page.getByRole('heading', { name: /^tu perfil$/i })).toHaveCount(0);
  });

  test('claim de perfil en Home cuando el username sigue siendo auto', async ({ page }) => {
    await page.route('**/api/profile/me', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-claim-user',
          username: 'user_abcdef12',
          display_name: 'Aficionado E2E',
          avatar_url: null,
          favorite_team: null,
          country: null,
          city: null,
          bio: null,
          created_at: new Date().toISOString(),
        }),
      });
    });

    await openAuthenticatedHome(page);

    const claim = page.getByTestId('claim-profile-card');
    await expect(claim).toBeVisible({ timeout: 15_000 });
    await expect(claim.getByLabel(/^nombre$/i)).toBeVisible();
    await expect(claim.getByLabel(/^username$/i)).toBeVisible();
    await expect(claim.getByRole('button', { name: /sugerir/i })).toBeVisible();
    await expect(claim.getByRole('button', { name: /guardar y continuar/i })).toBeVisible();
    await expect(claim.getByLabel(/equipo favorito/i)).toBeVisible();

    // Checklist no debe empujar al formulario completo de /profile
    const onboarding = page.getByRole('heading', { name: /primeros pasos/i });
    await expect(onboarding).toBeVisible();
    await expect(
      page.getByRole('link', { name: /completa tu perfil/i }),
    ).toHaveAttribute('href', /#claim-profile$/);
  });

  test.describe('guest', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('registro con sesión apunta a home (contrato de navegación)', async ({ page }) => {
      await page.goto('/register');
      await expect(page.getByRole('heading', { name: /crea tu cuenta/i })).toBeVisible();
      // Contrato de producto: tras registro con sesión → /home (no /profile).
      // Cubierto por unitario de ruta en RegisterPage; aquí validamos que el formulario existe.
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible();
    });
  });
});

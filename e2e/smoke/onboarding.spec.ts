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

    await expect(onboarding.or(wrapped).or(empty).or(comunidad)).toBeVisible({ timeout: 15_000 });

    // No debe ser el formulario de perfil como landing post-auth
    await expect(page.getByRole('heading', { name: /^tu perfil$/i })).toHaveCount(0);

    if (await onboarding.isVisible()) {
      await expect(page.getByText(/completa tu perfil/i)).toBeVisible();
      await expect(page.getByText(/crea tu primera cápsula/i )).toBeVisible();
      await expect(page.getByText(/sigue a otros aficionados/i)).toBeVisible();
    }
  });

  test('registro con sesión apunta a home (contrato de navegación)', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /crea tu cuenta/i })).toBeVisible();
    // Contrato de producto: tras registro con sesión → /home (no /profile).
    // Cubierto por unitario de ruta en RegisterPage; aquí validamos que el formulario existe.
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible();
  });
});

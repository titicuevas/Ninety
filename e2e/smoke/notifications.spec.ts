import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Smoke — notificaciones @smoke', () => {
  test('página de notificaciones accesible desde la campanita', async ({ page }) => {
    await openAuthenticatedHome(page);

    const bell = page.getByRole('link', { name: /notificaciones/i }).first();
    await expect(bell).toBeVisible({ timeout: 10_000 });
    await bell.click();

    await expect(page).toHaveURL(/\/notifications/);
    await expect(
      page.getByRole('heading', { name: /notificaciones/i }),
    ).toBeVisible();
  });

  test('muestra estado vacío o lista de notificaciones', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/notifications');
    await page.waitForURL(/\/notifications/);

    const empty = page.getByText(/sin notificaciones/i);
    const list = page.locator('[class*="divide-"]');

    await expect(empty.or(list)).toBeVisible({ timeout: 15_000 });
  });

  test('UI de push: activar, desactivar o sin configurar', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/notifications');
    await page.waitForURL(/\/notifications/);
    await expect(page.getByRole('heading', { name: /notificaciones/i })).toBeVisible();

    const enable = page.getByRole('button', { name: /activar alertas/i });
    const disable = page.getByRole('button', { name: /desactivar alertas/i });
    const testPush = page.getByRole('button', { name: /enviar prueba/i });
    const enabledLabel = page.getByText(/alertas activadas/i);
    const empty = page.getByText(/sin notificaciones/i);
    const list = page.locator('[class*="divide-"]');

    // La página carga aunque push no esté configurado en el entorno
    await expect(empty.or(list).or(enable).or(disable).or(enabledLabel)).toBeVisible({
      timeout: 15_000,
    });

    if (await enable.isVisible()) {
      await expect(enable).toBeEnabled();
    }
    if (await disable.isVisible()) {
      await expect(enabledLabel).toBeVisible();
      await expect(testPush).toBeVisible();
    }
  });

  test('muestra la tarjeta de estado de push', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/notifications');
    await page.waitForURL(/\/notifications/);

    await expect(page.getByText(/servidor push/i)).toBeVisible();
    await expect(page.getByText(/navegador/i)).toBeVisible();
    await expect(page.getByText(/permiso/i)).toBeVisible();

    await expect(
      page.getByText(/configurado|pendiente en backend\/railway/i),
    ).toBeVisible();
    await expect(
      page.getByText(/compatible|no compatible/i),
    ).toBeVisible();
    await expect(
      page.getByText(/permitidas|bloqueadas|pendientes|no compatible/i),
    ).toBeVisible();
  });
});

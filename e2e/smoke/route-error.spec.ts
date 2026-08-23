import { expect, test } from '@playwright/test';

test('el boundary de rutas muestra un fallback recuperable', async ({ page }) => {
  await page.goto('/__e2e/route-error');

  await expect(page.getByRole('heading', { name: /algo falló al cargar Ninety/i })).toBeVisible();
  await expect(page.getByText(/fallo E2E controlado del router/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /recargar/i })).toBeVisible();
});

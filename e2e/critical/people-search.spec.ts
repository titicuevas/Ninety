import { expect, test } from '@playwright/test';
import { API_BASE, goAppNav, readAccessToken } from '../helpers/auth';

test.describe('Crítico — búsqueda de aficionados @critical', () => {
  test('buscar aficionados responde en la UI', async ({ page }) => {
    await page.goto('/home');
    await goAppNav(page, /buscar/i);
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('heading', { name: /^buscar$/i })).toBeVisible();

    await page.getByRole('tab', { name: 'Aficionados' }).click();
    await expect(page).toHaveURL(/tab=people/);
    await expect(page.getByText(/encuentra aficionados/i)).toBeVisible();

    await page.getByLabel(/nombre o username/i).fill('zzzninetye2e');
    await expect(page.getByText(/sin resultados/i)).toBeVisible({ timeout: 20_000 });
  });

  test('API search de perfiles no falla con sesión', async ({ page, request }) => {
    await page.goto('/home');
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/profile/search?q=be`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { profiles: unknown[] };
    expect(Array.isArray(body.profiles)).toBeTruthy();
  });
});

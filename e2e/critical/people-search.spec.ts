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

    const suggestions = page.getByRole('heading', { name: /aficionados sugeridos/i });
    const emptyHint = page.getByText(/encuentra aficionados/i);
    await expect(suggestions.or(emptyHint)).toBeVisible({ timeout: 15_000 });

    if (await suggestions.isVisible()) {
      const followBtn = page.getByRole('button', { name: /^seguir$/i }).first();
      await expect(followBtn).toBeVisible();
      await followBtn.click();
      const followingBtn = page.getByRole('button', { name: /dejar de seguir/i }).first();
      await expect(followingBtn).toHaveAttribute('aria-pressed', 'true');
    }

    await page.getByLabel(/nombre o username/i).fill('zzzninetye2e');
    await expect(page.getByText(/sin resultados/i)).toBeVisible({ timeout: 20_000 });
  });

  test('API search de perfiles anota followed_by_me', async ({ page, request }) => {
    await page.goto('/home');
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/profile/search?q=be`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      profiles: Array<{ followed_by_me?: boolean }>;
    };
    expect(Array.isArray(body.profiles)).toBeTruthy();
    for (const profile of body.profiles) {
      expect(typeof profile.followed_by_me).toBe('boolean');
    }
  });
});

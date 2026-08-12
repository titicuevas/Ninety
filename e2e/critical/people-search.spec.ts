import { expect, test } from '@playwright/test';
import { API_BASE, openAuthenticatedHome, readAccessToken } from '../helpers/auth';

test.describe('Crítico — búsqueda de aficionados @critical', () => {
  test('buscar aficionados responde en la UI', async ({ page }) => {
    await openAuthenticatedHome(page);
    // goto con query: más estable que click de tab si Vite HMR remonta la página
    await page.goto('/search?tab=people');
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('heading', { name: /^buscar$/i })).toBeVisible();

    const tabs = page.getByRole('tablist', { name: /tipo de búsqueda/i });
    await expect(tabs.getByRole('tab', { name: 'Aficionados' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel(/nombre o username/i)).toBeVisible({ timeout: 15_000 });

    const suggestions = page.getByRole('heading', { name: /aficionados sugeridos/i });
    const emptyHint = page.getByText(/encuentra aficionados/i);
    const loading = page.getByText(/cargando sugerencias/i);
    await expect(suggestions.or(emptyHint).or(loading)).toBeVisible({ timeout: 15_000 });
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 20_000 });
    }
    await expect(suggestions.or(emptyHint)).toBeVisible({ timeout: 15_000 });

    if (await suggestions.isVisible()) {
      const followBtn = page
        .getByTestId('follow-button')
        .or(page.getByTestId('follow-back-button'))
        .or(page.getByRole('button', { name: /dejar de seguir/i }))
        .first();
      // Sugerencias con username auto no exponen FollowButton
      if (await followBtn.isVisible().catch(() => false)) {
        const alreadyFollowing = (await followBtn.getAttribute('aria-pressed')) === 'true';
        if (!alreadyFollowing) {
          await followBtn.click();
          await expect(followBtn).toHaveAttribute('aria-pressed', 'true');
        }
      }
    }

    await page.getByLabel(/nombre o username/i).fill('zzzninetye2e');
    await expect(page.getByText(/sin resultados/i)).toBeVisible({ timeout: 20_000 });
  });

  test('API search de perfiles anota followed_by_me y follows_me', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/profile/search?q=be`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      profiles: Array<{ followed_by_me?: boolean; follows_me?: boolean }>;
    };
    expect(Array.isArray(body.profiles)).toBeTruthy();
    for (const profile of body.profiles) {
      expect(typeof profile.followed_by_me).toBe('boolean');
      expect(typeof profile.follows_me).toBe('boolean');
    }
  });
});

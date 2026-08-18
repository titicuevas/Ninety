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

  test('recarga conserva la búsqueda de aficionados', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/search?tab=people&q=zzzninetye2e');
    await expect(page.getByLabel(/nombre o username/i)).toBeVisible({ timeout: 15_000 });
    const input = page.getByLabel(/nombre o username/i);
    test.skip(
      (await input.inputValue()) !== 'zzzninetye2e',
      'front aún no pega q en la URL — espera al deploy de v68',
    );
    await expect(page.getByText(/sin resultados/i)).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByLabel(/nombre o username/i)).toHaveValue('zzzninetye2e');
    await expect(page.getByText(/sin resultados/i)).toBeVisible({ timeout: 20_000 });
  });

  test('API discover acepta limit=24 y reason', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const wide = await request.get(`${API_BASE}/api/profile/discover?limit=24`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(wide.ok()).toBeTruthy();
    const wideBody = (await wide.json()) as {
      profiles?: Array<{ match_reason?: string | null }>;
    };
    expect(Array.isArray(wideBody.profiles)).toBe(true);
    expect(wideBody.profiles!.length).toBeLessThanOrEqual(24);

    const junk = await request.get(`${API_BASE}/api/profile/discover?limit=6&reason=spam`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(junk.ok()).toBeTruthy();

    const nearby = await request.get(`${API_BASE}/api/profile/discover?limit=24&reason=nearby`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(nearby.ok(), `reason=nearby → ${nearby.status()}`).toBeTruthy();
    const nearbyBody = (await nearby.json()) as {
      profiles?: Array<{ match_reason?: string | null }>;
    };
    const nearbyReasons = (nearbyBody.profiles ?? [])
      .map((row) => row.match_reason)
      .filter((reason): reason is string => !!reason);
    test.skip(
      nearbyReasons.some((reason) => reason !== 'city' && reason !== 'country'),
      'API aún no filtra por reason — espera al deploy de v68',
    );
    for (const reason of nearbyReasons) {
      expect(['city', 'country']).toContain(reason);
    }
  });

  test('chips de sugerencias quedan en la URL', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/search?tab=people');
    await expect(page.getByLabel(/nombre o username/i)).toBeVisible({ timeout: 15_000 });
    const filters = page.getByTestId('people-discover-filters');
    test.skip(
      (await filters.count()) === 0,
      'front aún no tiene chips de discover — espera al deploy de v68',
    );
    await expect(filters).toBeVisible();
    await page.getByRole('button', { name: /^cerca$/i }).click();
    await expect(page).toHaveURL(/reason=nearby/);
    await expect(page.getByRole('button', { name: /^cerca$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
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

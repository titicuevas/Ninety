import { expect, test } from '@playwright/test';
import { API_BASE, goAppNav, openAuthenticatedHome, readAccessToken } from '../helpers/auth';

test.describe('Smoke — feed y discover @smoke', () => {
  test('feed con tabs Siguiendo/Explorar y orden', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /feed/i);

    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();

    const followingTab = page.getByRole('tab', { name: /^siguiendo$/i });
    const exploreTab = page.getByRole('tab', { name: /^explorar$/i });
    const recentTab = page.getByRole('tab', { name: /recientes/i });
    const popularTab = page.getByRole('tab', { name: /populares/i });

    await expect(followingTab).toBeVisible({ timeout: 15_000 });
    await expect(exploreTab).toBeVisible();
    await expect(recentTab).toBeVisible();
    await expect(popularTab).toBeVisible();
    await expect(followingTab).toHaveAttribute('aria-selected', 'true');

    await exploreTab.click();
    await expect(exploreTab).toHaveAttribute('aria-selected', 'true');
    await expect(
      page
        .getByText(/partidos públicos de la comunidad/i)
        .or(page.getByText(/aún no hay cápsulas públicas/i))
        .or(page.locator('ul li').first()),
    ).toBeVisible({ timeout: 15_000 });

    await popularTab.click();
    await expect(popularTab).toHaveAttribute('aria-selected', 'true');

    await followingTab.click();
    await expect(followingTab).toHaveAttribute('aria-selected', 'true');

    const empty = page.getByText(/tu feed está vacío/i);
    const listItem = page.locator('ul li').first();
    await expect(empty.or(listItem).or(recentTab)).toBeVisible({ timeout: 15_000 });

    if (await empty.isVisible()) {
      await expect(page.getByRole('button', { name: /explorar comunidad/i })).toBeVisible();
    } else {
      const loadMore = page.getByRole('button', { name: /cargar más/i });
      if (await loadMore.isVisible()) {
        await expect(loadMore).toBeEnabled();
      }
    }
  });

  test('si el feed Siguiendo está vacío, muestra sugerencias o CTA', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /feed/i);
    await expect(page).toHaveURL(/\/feed/);

    await page.getByRole('tab', { name: /^siguiendo$/i }).click();

    const empty = page.getByText(/tu feed está vacío/i);
    const hasContent = page.locator('ul li').first();

    await expect(empty.or(hasContent)).toBeVisible({ timeout: 15_000 });

    if (await empty.isVisible()) {
      await expect(page.getByRole('link', { name: /buscar aficionados/i })).toBeVisible();

      const suggestions = page.getByRole('heading', { name: /aficionados sugeridos/i });
      if (await suggestions.isVisible()) {
        await expect(page.getByRole('button', { name: /^seguir$/i }).first()).toBeVisible();
      }
    }
  });

  test('API feed acepta scope, sort y filtros de contenido', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    for (const [scope, sort] of [
      ['following', 'recent'],
      ['following', 'popular'],
      ['explore', 'recent'],
      ['explore', 'popular'],
    ] as const) {
      const res = await request.get(
        `${API_BASE}/api/capsules/feed?limit=5&offset=0&scope=${scope}&sort=${sort}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(res.ok(), `${scope}/${sort} → ${res.status()}`).toBeTruthy();
      const body = (await res.json()) as {
        capsules?: unknown[];
        total?: number;
        scope?: string;
        sort?: string;
      };
      expect(Array.isArray(body.capsules)).toBe(true);
      expect(body.capsules!.length).toBeLessThanOrEqual(5);
      expect(typeof body.total).toBe('number');
      expect(body.scope).toBe(scope);
      expect(body.sort).toBe(sort);
    }

    const filtered = await request.get(
      `${API_BASE}/api/capsules/feed?limit=5&offset=0&scope=explore&photos=1&competition=${encodeURIComponent('La Liga')}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(filtered.ok(), `photos+competition → ${filtered.status()}`).toBeTruthy();
    const filteredBody = (await filtered.json()) as {
      capsules?: unknown[];
      photos?: boolean;
      competition?: string | null;
    };
    expect(Array.isArray(filteredBody.capsules)).toBe(true);
    expect(filteredBody.photos).toBe(true);
    expect(filteredBody.competition).toBe('la liga');
  });

  test('feed filtros solo fotos y competición en URL', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /feed/i);
    await expect(page).toHaveURL(/\/feed/);

    const photosChip = page.getByRole('button', { name: /solo con fotos/i });
    await expect(photosChip).toBeVisible({ timeout: 15_000 });
    await photosChip.click();
    await expect(page).toHaveURL(/photos=1/);
    await expect(photosChip).toHaveAttribute('aria-pressed', 'true');

    const ligaChip = page.getByRole('button', { name: /^la liga$/i });
    await ligaChip.click();
    await expect(page).toHaveURL(/competition=La(\+|%20)Liga/);
    await expect(ligaChip).toHaveAttribute('aria-pressed', 'true');

    const clear = page.getByRole('button', { name: /quitar filtros/i }).first();
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page).not.toHaveURL(/photos=1/);
    await expect(page).not.toHaveURL(/competition=/);
  });

  test('Mis Capsules accesible con lista, empty o cargar más', async ({ page }) => {
    await openAuthenticatedHome(page);
    await goAppNav(page, /capsules/i);

    await expect(page).toHaveURL(/\/capsules/);
    await expect(page.getByRole('heading', { name: /mis capsules/i })).toBeVisible();
    await expect(page.getByLabel(/buscar en tus capsules/i)).toBeVisible();
    await expect(page.getByRole('group', { name: /filtrar por valoración/i })).toBeVisible();

    const empty = page.getByText(/aún no tienes capsules/i);
    const listItem = page.locator('ul li').first();
    const loadMore = page.getByRole('button', { name: /cargar más/i });
    const filterEmpty = page.getByText(/ningún partido con estos filtros/i);

    await expect(empty.or(listItem).or(loadMore).or(filterEmpty)).toBeVisible({ timeout: 15_000 });
  });

  test('API Mis Capsules acepta filtros de diario', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(
      `${API_BASE}/api/capsules/me?limit=5&offset=0&rating_min=4&visibility=all`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { capsules?: unknown[]; total?: number };
    expect(Array.isArray(body.capsules)).toBe(true);
    expect(body.capsules!.length).toBeLessThanOrEqual(5);
    expect(typeof body.total).toBe('number');
  });

  test('API discover prioriza perfiles y puede marcar match_reason', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const res = await request.get(`${API_BASE}/api/profile/discover?limit=6`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      profiles?: Array<{ id?: string; username?: string; match_reason?: string | null }>;
    };
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(body.profiles!.length).toBeLessThanOrEqual(6);
    for (const profile of body.profiles!) {
      expect(typeof profile.id).toBe('string');
      expect(typeof profile.username).toBe('string');
      if (profile.match_reason != null) {
        expect(['favorite_team', 'city', 'country']).toContain(profile.match_reason);
      }
    }
  });
});

import { expect, test } from '@playwright/test';
import { API_BASE, DEMO_USERNAME } from '../helpers/auth';

test.describe('Smoke — público @smoke', () => {
  test('landing carga con marca Ninety', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /ninety/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /crear cuenta/i }).first()).toBeVisible();
  });

  test('login muestra formulario', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
  });

  test('perfil público demo responde', async ({ page }) => {
    await page.goto(`/u/${DEMO_USERNAME}`);
    await expect(page.getByRole('heading', { name: /beta ninety/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('link', { name: /seguidores/i })).toBeVisible();
  });

  test('listas followers/following públicas no 401', async ({ request }) => {
    const followers = await request.get(`${API_BASE}/api/profile/${DEMO_USERNAME}/followers`);
    const following = await request.get(`${API_BASE}/api/profile/${DEMO_USERNAME}/following`);
    expect(followers.status()).not.toBe(401);
    expect(following.status()).not.toBe(401);
    expect(followers.ok()).toBeTruthy();
    expect(following.ok()).toBeTruthy();
  });

  test('API health', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { status?: string };
    expect(body.status).toBe('ok');
  });
});

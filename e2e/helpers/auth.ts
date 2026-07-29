import { expect, type Page } from '@playwright/test';

export function requireDemoCredentials() {
  const email = process.env.TEST_USER_EMAIL ?? 'beta@ninety.app';
  const password = process.env.TEST_USER_PASSWORD;
  if (!password) {
    throw new Error(
      'Falta TEST_USER_PASSWORD en backend/.env para los E2E autenticados.\n' +
        'Añádela y vuelve a ejecutar: npm run test:e2e',
    );
  }
  return { email, password };
}

/** Login por UI (útil en setup y tests sin storageState). */
export async function loginAsDemo(page: Page) {
  const { email, password } = requireDemoCredentials();
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
}

/**
 * Abre Home con storageState si sigue siendo válido; si no, rehace login por UI.
 * Evita flakes cuando el refresh token del auth.setup ya se ha quedado viejo.
 */
export async function openAuthenticatedHome(page: Page) {
  await page.goto('/home');
  await page.waitForURL(/\/(home|login)/, { timeout: 20_000 });

  if (page.url().includes('/login')) {
    await loginAsDemo(page);
  }

  await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
}

/**
 * Navegación client-side tras login: evita race de ProtectedRoute
 * al hacer page.goto() con sesión en localStorage.
 */
export async function goAppNav(page: Page, name: RegExp | string) {
  await page
    .getByRole('navigation', { name: /navegación principal/i })
    .getByRole('link', { name })
    .first()
    .click();
}

export async function readAccessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const raw =
      window.localStorage.getItem('ninety.session:v1') ??
      window.localStorage.getItem('ninety.session');
    if (!raw) return null;
    try {
      return (JSON.parse(raw) as { access_token?: string }).access_token ?? null;
    } catch {
      return null;
    }
  });
}

export const DEMO_USERNAME = process.env.TEST_USER_USERNAME ?? 'beta_ninety';
export const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3001';

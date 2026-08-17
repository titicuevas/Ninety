import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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

/** Alineado con seed:demo / README (`aficionado_demo`). */
export const DEMO_USERNAME =
  process.env.TEST_USER_USERNAME ?? process.env.DEMO_USERNAME ?? 'aficionado_demo';
export const API_BASE = process.env.E2E_API_URL ?? 'http://localhost:3001';

const SESSION_KEY = 'ninety.session:v1';
const LEGACY_SESSION_KEY = 'ninety.session';
const LOGIN_ATTEMPTS = 3;
const AUTH_FILE = path.join('e2e', '.auth', 'user.json');
const SESSION_CACHE_FILE = path.join('e2e', '.auth', 'session-cache.json');
/** Margen antes de expires_at para forzar refresh (alineado con useAuthInit). */
const REFRESH_MARGIN_SEC = 120;

type AuthApiSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
};

/** Cache en proceso: evita martillar POST /login (rate limit) en suites largas. */
let memorySession: AuthApiSession | null = null;

function isAccessTokenFresh(session: AuthApiSession, marginSec = REFRESH_MARGIN_SEC) {
  if (!session.expires_at) return true;
  return session.expires_at * 1000 > Date.now() + marginSec * 1000;
}

function readDiskSession(): AuthApiSession | null {
  try {
    const raw = readFileSync(SESSION_CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as AuthApiSession;
    if (parsed?.access_token && parsed?.refresh_token) return parsed;
  } catch {
    /* sin cache */
  }
  return null;
}

function writeDiskSession(session: AuthApiSession) {
  mkdirSync(path.dirname(SESSION_CACHE_FILE), { recursive: true });
  writeFileSync(SESSION_CACHE_FILE, JSON.stringify(session), 'utf8');
  memorySession = session;
}

async function refreshViaApi(
  request: APIRequestContext,
  refreshToken: string,
): Promise<AuthApiSession> {
  const res = await request.post(`${API_BASE}/api/auth/refresh`, {
    data: { refresh_token: refreshToken },
    timeout: 30_000,
  });
  const bodyText = await res.text();
  if (!res.ok()) {
    throw new Error(`API refresh ${res.status()}: ${bodyText.slice(0, 200)}`);
  }
  const body = JSON.parse(bodyText) as { session?: AuthApiSession };
  if (!body.session?.access_token || !body.session.refresh_token) {
    throw new Error('API refresh sin session válida');
  }
  return body.session;
}

async function loginViaApi(
  request: APIRequestContext,
  credentials = requireDemoCredentials(),
): Promise<AuthApiSession> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= LOGIN_ATTEMPTS; attempt++) {
    try {
      const res = await request.post(`${API_BASE}/api/auth/login`, {
        data: credentials,
        timeout: 30_000,
      });
      const bodyText = await res.text();
      if (!res.ok()) {
        throw new Error(`API login ${res.status()}: ${bodyText.slice(0, 200)}`);
      }
      const body = JSON.parse(bodyText) as { session?: AuthApiSession };
      if (!body.session?.access_token || !body.session.refresh_token) {
        throw new Error('API login sin session válida');
      }
      return body.session;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < LOGIN_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1_500 * attempt));
      }
    }
  }

  throw lastError ?? new Error('API login falló');
}

/**
 * Sesión fresca priorizando refresh (no cuenta tanto en rate-limit de login)
 * y reutilizando cache entre tests del mismo worker.
 */
export async function obtainApiSession(request: APIRequestContext): Promise<AuthApiSession> {
  const candidates = [memorySession, readDiskSession()].filter(Boolean) as AuthApiSession[];

  for (const candidate of candidates) {
    if (isAccessTokenFresh(candidate)) {
      memorySession = candidate;
      return candidate;
    }
    try {
      const refreshed = await refreshViaApi(request, candidate.refresh_token);
      writeDiskSession(refreshed);
      return refreshed;
    } catch {
      /* probar siguiente o login */
    }
  }

  const session = await loginViaApi(request);
  writeDiskSession(session);
  return session;
}

const homeHeading = (page: Page) =>
  page.getByRole('heading', { name: /esto es tu fútbol|tu wrapped empieza/i });
const loginHeading = (page: Page) =>
  page.getByRole('heading', { name: /bienvenido de vuelta/i });

async function persistAuthState(page: Page) {
  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });

  const live = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthApiSession;
    } catch {
      return null;
    }
  }, SESSION_KEY);
  if (live?.access_token && live.refresh_token) {
    writeDiskSession(live);
  }
}

async function seedSessionIntoContext(page: Page, session: AuthApiSession) {
  // addInitScript se acumula: también escribimos en localStorage tras goto vía evaluate
  // si la app ya arrancó. El init cubre la primera navegación del contexto.
  await page.context().addInitScript(
    ({ key, legacyKey, session: sess }) => {
      window.localStorage.setItem(key, JSON.stringify(sess));
      window.localStorage.removeItem(legacyKey);
    },
    { key: SESSION_KEY, legacyKey: LEGACY_SESSION_KEY, session },
  );
}

async function writeSessionToPage(page: Page, session: AuthApiSession) {
  await page.evaluate(
    ({ key, legacyKey, session: sess }) => {
      window.localStorage.setItem(key, JSON.stringify(sess));
      window.localStorage.removeItem(legacyKey);
    },
    { key: SESSION_KEY, legacyKey: LEGACY_SESSION_KEY, session },
  );
}

/**
 * Login fiable: POST login/refresh + seed localStorage vía addInitScript
 * (antes de que la app lea storageState muerto / rote refresh).
 */
export async function establishAuthenticatedSession(page: Page) {
  const session = await obtainApiSession(page.request);
  await seedSessionIntoContext(page, session);

  await page.goto('/home');
  await expect(homeHeading(page).or(loginHeading(page))).toBeVisible({ timeout: 25_000 });

  if (page.url().includes('/login') || (await loginHeading(page).isVisible().catch(() => false))) {
    // Re-login API (evita UI: dispara rate-limit) + rehydrate + reload
    memorySession = null;
    const fresh = await obtainApiSession(page.request);
    await writeSessionToPage(page, fresh);
    await page.goto('/home');
    await expect(homeHeading(page).or(loginHeading(page))).toBeVisible({ timeout: 25_000 });
  }

  if (page.url().includes('/login') || (await loginHeading(page).isVisible().catch(() => false))) {
    // Último recurso: UI login (solo si API también falla)
    await loginAsDemo(page);
  }

  await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
  await expect(homeHeading(page)).toBeVisible({ timeout: 20_000 });
  await persistAuthState(page);
}

/** Login por UI (útil en tests que ejercitan el formulario). */
export async function loginAsDemo(page: Page) {
  const { email, password } = requireDemoCredentials();
  await page.goto('/login');
  await expect(loginHeading(page)).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
  await expect(homeHeading(page)).toBeVisible({ timeout: 20_000 });
}

/**
 * Abre Home con sesión garantizada: siempre re-hidrata tokens frescos
 * (API refresh/login) antes de confiar en storageState del setup.
 */
export async function openAuthenticatedHome(page: Page) {
  const session = await obtainApiSession(page.request);
  await seedSessionIntoContext(page, session);

  await page.goto('/home');
  await expect(homeHeading(page).or(loginHeading(page))).toBeVisible({ timeout: 25_000 });

  const needsReauth =
    page.url().includes('/login') || (await loginHeading(page).isVisible().catch(() => false));

  if (needsReauth) {
    await establishAuthenticatedSession(page);
    return;
  }

  await expect(page).toHaveURL(/\/home/, { timeout: 20_000 });
  await expect(homeHeading(page)).toBeVisible({ timeout: 20_000 });
  await persistAuthState(page);
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

export type DemoPublicProfile = {
  profile: {
    username?: string | null;
    display_name?: string | null;
  };
  capsules?: Array<{ id?: string }>;
  total?: number;
  stats?: { totalMatches?: number };
  years?: number[];
  featured_collection?: { name?: string; slug?: string } | null;
};

/** Carga el perfil demo público o salta el test si no está sembrado en ese entorno. */
export async function requirePublicDemoProfile(
  request: APIRequestContext,
  query = 'limit=1&offset=0',
): Promise<DemoPublicProfile> {
  const res = await request.get(
    `${API_BASE}/api/capsules/user/${encodeURIComponent(DEMO_USERNAME)}?${query}`,
  );
  if (res.status() === 404) {
    test.skip(
      true,
      `No hay perfil público @${DEMO_USERNAME} en ${API_BASE}. Ejecuta npm run seed:demo o define TEST_USER_USERNAME.`,
    );
  }
  expect(res.ok(), `API perfil @${DEMO_USERNAME} → ${res.status()}`).toBeTruthy();
  return (await res.json()) as DemoPublicProfile;
}

export function demoDisplayName(data: DemoPublicProfile): string {
  return data.profile.display_name?.trim() || data.profile.username || DEMO_USERNAME;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

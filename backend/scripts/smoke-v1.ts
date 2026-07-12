/**
 * Smoke test v1 — Supabase + API + flujos clave.
 *
 * Uso:
 *   npm run smoke:v1 --prefix backend              # local API
 *   API_URL=https://ninety-api.up.railway.app npm run smoke:v1 --prefix backend
 *
 * Con credenciales demo (opcional, backend/.env):
 *   TEST_USER_PASSWORD=... npm run smoke:v1 --prefix backend
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { requireTestCredentials } from './testCredentials.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const API = process.env.API_URL ?? 'http://localhost:3001';
const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:5173';

let failed = false;

function pass(msg: string) {
  console.log(`✅ ${msg}`);
}

function fail(msg: string) {
  console.error(`❌ ${msg}`);
  failed = true;
}

function warn(msg: string) {
  console.warn(`⚠️  ${msg}`);
}

async function checkJson(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, init);
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function checkSupabase() {
  console.log('\n📦 Supabase');
  console.log('─'.repeat(40));
  try {
    execSync('npm run verify:capsules', { stdio: 'inherit', cwd: resolve(__dirname, '..') });
    execSync('npm run verify:storage', { stdio: 'inherit', cwd: resolve(__dirname, '..') });
  } catch {
    failed = true;
  }
}

async function checkApiBasics() {
  console.log('\n🌐 API básica');
  console.log('─'.repeat(40));
  console.log(`   Target: ${API}`);

  try {
    const health = await checkJson('/api/health');
    if (health.res.status === 200 && health.body.status === 'ok') {
      pass('GET /api/health');
    } else {
      fail(`GET /api/health → ${health.res.status}`);
    }
  } catch (err) {
    fail(`GET /api/health no responde: ${err instanceof Error ? err.message : err}`);
    return;
  }

  const protectedRoutes = [
    '/api/profile/me',
    '/api/capsules/me',
    '/api/capsules/feed',
  ] as const;

  for (const path of protectedRoutes) {
    const { res } = await checkJson(path);
    if (res.status === 401) {
      pass(`${path} requiere auth`);
    } else {
      fail(`${path} debería devolver 401 sin token (got ${res.status})`);
    }
  }
}

async function checkPublicProfile() {
  console.log('\n👤 Perfil público');
  console.log('─'.repeat(40));

  const username = process.env.SMOKE_PUBLIC_USERNAME ?? 'aficionado_demo';

  try {
    const { res, body } = await checkJson(`/api/capsules/user/${encodeURIComponent(username)}`);
    if (res.status === 404) {
      warn(`Perfil @${username} no existe — omite o ejecuta npm run seed:demo`);
      return;
    }
    if (res.status !== 200) {
      fail(`GET /api/capsules/user/${username} → ${res.status}`);
      return;
    }
    if (!body.profile?.username) {
      fail('Respuesta sin profile.username');
      return;
    }
    pass(`Perfil público @${body.profile.username} (${body.capsules?.length ?? 0} capsules)`);
  } catch (err) {
    fail(`Perfil público: ${err instanceof Error ? err.message : err}`);
  }
}

async function checkAuthenticatedFlow() {
  console.log('\n🔐 Flujo autenticado');
  console.log('─'.repeat(40));

  if (!process.env.TEST_USER_PASSWORD) {
    warn('Sin TEST_USER_PASSWORD — omitiendo login, feed y follows');
    warn('Añádela en backend/.env para probar el flujo completo');
    return;
  }

  let token: string;

  try {
    const { email, password } = requireTestCredentials();
    const login = await checkJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (login.res.status !== 200 || !login.body.session?.access_token) {
      fail(`Login falló (${login.res.status})`);
      return;
    }
    token = login.body.session.access_token;
    pass(`Login ${email}`);
  } catch (err) {
    fail(`Login: ${err instanceof Error ? err.message : err}`);
    return;
  }

  const auth = { Authorization: `Bearer ${token}` };

  const profile = await checkJson('/api/profile/me', { headers: auth });
  if (profile.res.status === 200 && profile.body.id) {
    pass('GET /api/profile/me');
  } else {
    fail(`GET /api/profile/me → ${profile.res.status}`);
  }

  const feed = await checkJson('/api/capsules/feed?limit=5', { headers: auth });
  if (feed.res.status === 200 && Array.isArray(feed.body.capsules)) {
    pass(`GET /api/capsules/feed (${feed.body.capsules.length} items, siguiendo: ${feed.body.following_count ?? '?'})`);
  } else {
    fail(`GET /api/capsules/feed → ${feed.res.status}`);
  }

  const demoUser = process.env.SMOKE_FOLLOW_USERNAME ?? 'aficionado_demo';
  if (profile.body.username === demoUser) {
    warn('Usuario demo siguiéndose a sí mismo — omitiendo test follow');
    return;
  }

  const follow = await fetch(`${API}/api/profile/${encodeURIComponent(demoUser)}/follow`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
  });

  if (follow.status === 201) {
    pass(`POST follow @${demoUser}`);
    const unfollow = await fetch(`${API}/api/profile/${encodeURIComponent(demoUser)}/follow`, {
      method: 'DELETE',
      headers: auth,
    });
    if (unfollow.status === 200) {
      pass(`DELETE unfollow @${demoUser}`);
    } else {
      fail(`DELETE unfollow → ${unfollow.status}`);
    }
  } else if (follow.status === 404) {
    warn(`@${demoUser} no existe para probar follow`);
  } else if (follow.status === 409) {
    pass(`Ya seguías a @${demoUser} (409 OK)`);
  } else {
    fail(`POST follow → ${follow.status}`);
  }
}

async function checkFrontend() {
  console.log('\n🖥️  Frontend');
  console.log('─'.repeat(40));
  console.log(`   Target: ${FRONTEND}`);

  try {
    const res = await fetch(FRONTEND);
    if (res.ok) {
      pass(`Frontend responde (${res.status})`);
    } else {
      fail(`Frontend → ${res.status}`);
    }
  } catch (err) {
    warn(`Frontend no accesible: ${err instanceof Error ? err.message : err}`);
    warn('Normal si solo pruebas la API en Railway');
  }
}

async function main() {
  console.log('🧪 Smoke test v1 — Ninety\n');
  console.log('═'.repeat(40));

  await checkSupabase();
  await checkApiBasics();
  await checkPublicProfile();
  await checkAuthenticatedFlow();
  await checkFrontend();

  console.log('\n' + '═'.repeat(40));
  if (failed) {
    console.error('\n❌ Smoke test falló — revisa los errores arriba.\n');
    process.exit(1);
  }

  console.log('\n🎉 Smoke test v1 OK — v1 lista para beta.\n');
}

main().catch((err) => {
  console.error('\n❌ Error inesperado:', err instanceof Error ? err.message : err);
  process.exit(1);
});

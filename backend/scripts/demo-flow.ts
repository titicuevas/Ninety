/**
 * Prueba E2E del usuario demo — login, capsules, feed, comentarios, perfil público.
 *
 * Uso:
 *   npm run demo:flow --prefix backend
 *   API_URL=https://ninety-api.up.railway.app npm run demo:flow --prefix backend
 *
 * Requiere TEST_USER_PASSWORD en backend/.env (cuenta demo@ninety.app).
 * Si no hay partidos: npm run seed:demo (con API en marcha).
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireTestCredentials } from './testCredentials.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const API = process.env.API_URL ?? 'http://localhost:3001';
const DEMO_USERNAME = process.env.SMOKE_PUBLIC_USERNAME ?? 'aficionado_demo';

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

async function api<T = unknown>(
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<{ status: number; body: T }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, body };
}

async function main() {
  console.log('🧪 Demo flow — Ninety v1\n');
  console.log(`   API: ${API}`);
  console.log('═'.repeat(44));

  let token: string;
  let email: string;

  try {
    ({ email, password } = requireTestCredentials());
  } catch (err) {
    fail(err instanceof Error ? err.message : 'Faltan credenciales demo');
    process.exit(1);
  }

  const login = await api<{ session?: { access_token: string }; error?: string }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );

  if (login.status !== 200 || !login.body.session?.access_token) {
    fail(`Login falló (${login.status}): ${login.body.error ?? 'sin token'}`);
    process.exit(1);
  }

  token = login.body.session.access_token;
  pass(`Login ${email}`);

  const me = await api<{ id: string; username: string | null }>('/api/profile/me', {}, token);
  if (me.status !== 200) {
    fail(`GET /api/profile/me → ${me.status}`);
  } else {
    pass(`Perfil: @${me.body.username ?? '(sin username)'}`);
  }

  const myCapsules = await api<{ capsules: Array<{ id: string; home_team_name: string }> }>(
    '/api/capsules/me',
    {},
    token,
  );

  if (myCapsules.status !== 200) {
    fail(`GET /api/capsules/me → ${myCapsules.status}`);
  } else {
    const count = myCapsules.body.capsules?.length ?? 0;
    if (count === 0) {
      warn('Sin partidos en el diario demo — ejecuta: npm run seed:demo');
    } else {
      pass(`Mis Capsules: ${count} partido(s)`);
    }
  }

  const feed = await api<{ capsules: unknown[]; following_count?: number }>(
    '/api/capsules/feed?limit=10',
    {},
    token,
  );
  if (feed.status === 200) {
    pass(`Feed: ${feed.body.capsules?.length ?? 0} entrada(s), siguiendo ${feed.body.following_count ?? 0}`);
  } else {
    fail(`GET /api/capsules/feed → ${feed.status}`);
  }

  const publicProfile = await api<{ profile: { username: string }; capsules: unknown[] }>(
    `/api/capsules/user/${encodeURIComponent(DEMO_USERNAME)}`,
    {},
    token,
  );
  if (publicProfile.status === 200) {
    pass(`Perfil público @${publicProfile.body.profile.username}: ${publicProfile.body.capsules?.length ?? 0} capsules`);
  } else if (publicProfile.status === 404) {
    warn(`Perfil @${DEMO_USERNAME} no encontrado`);
  } else {
    fail(`GET perfil público → ${publicProfile.status}`);
  }

  const capsuleId = myCapsules.body.capsules?.[0]?.id;
  if (capsuleId) {
    const toxic = await api<{ error?: string }>(
      `/api/capsules/${capsuleId}/comments`,
      { method: 'POST', body: JSON.stringify({ body: 'vete a la mierda' }) },
      token,
    );
    if (toxic.status === 400 && toxic.body.error?.includes('ofensivo')) {
      pass('Moderación de comentarios bloquea insultos');
    } else {
      fail(`Moderación no bloqueó insulto (status ${toxic.status})`);
    }

    const clean = await api<{ id: string }>(
      `/api/capsules/${capsuleId}/comments`,
      { method: 'POST', body: JSON.stringify({ body: 'Prueba automática v1 — gran partido ⚽' }) },
      token,
    );
    if (clean.status === 201 && clean.body.id) {
      pass('Comentario limpio publicado');
      const del = await api(`/api/capsules/${capsuleId}/comments/${clean.body.id}`, { method: 'DELETE' }, token);
      if (del.status === 204) pass('Comentario de prueba eliminado');
    } else if (clean.status === 503) {
      warn('Comentarios no disponibles en Supabase');
    } else {
      fail(`Comentario limpio falló (${clean.status})`);
    }
  }

  if (me.body.username && me.body.username !== DEMO_USERNAME) {
    const follow = await api(`/api/profile/${encodeURIComponent(DEMO_USERNAME)}/follow`, { method: 'POST' }, token);
    if (follow.status === 201 || follow.status === 409) {
      pass(`Follow @${DEMO_USERNAME}`);
      await api(`/api/profile/${encodeURIComponent(DEMO_USERNAME)}/follow`, { method: 'DELETE' }, token);
    } else if (follow.status === 503) {
      warn('Follows no disponibles — migración user_follows');
    } else {
      fail(`Follow falló (${follow.status})`);
    }
  }

  console.log('\n' + '═'.repeat(44));
  if (failed) {
    console.error('\n❌ Demo flow falló.\n');
    process.exit(1);
  }

  console.log('\n🎉 Demo flow OK — listo para probar en el navegador.');
  console.log(`   Login: ${email}`);
  console.log(`   Perfil: /u/${DEMO_USERNAME}`);
  console.log('   Rutas: /home · /feed · /search · /capsules · /profile\n');
}

main().catch((err) => {
  console.error('\n❌', err instanceof Error ? err.message : err);
  process.exit(1);
});

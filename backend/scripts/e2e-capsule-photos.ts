/**
 * E2E: login, subir 6 fotos y crear Capsule con todos los campos.
 * Uso: npm run test:capsule-photos --prefix backend
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const API = process.env.API_URL ?? 'http://localhost:3001';
const email = process.env.TEST_USER_EMAIL ?? 'demo@ninety.app';
const password = process.env.TEST_USER_PASSWORD ?? 'DemoNinety123!';
const photoDir = process.env.TEST_PHOTO_DIR ?? '/tmp/ninety-test-photos';

async function login(): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login falló (${res.status}): ${typeof body.error === 'string' ? body.error : 'error desconocido'}`);
  }
  const token = body.session?.access_token;
  if (!token) throw new Error('Login sin access_token');
  console.log('✅ Login OK');
  return token;
}

async function uploadPhotos(token: string): Promise<string[]> {
  const paths = [1, 2, 3, 4, 5, 6].map((n) => resolve(photoDir, `photo-${n}.jpg`));
  for (const p of paths) {
    if (!existsSync(p)) throw new Error(`Falta foto de prueba: ${p}`);
  }

  const form = new FormData();
  for (const p of paths) {
    const buf = readFileSync(p);
    form.append('photos', new Blob([buf], { type: 'image/jpeg' }), `photo-${paths.indexOf(p) + 1}.jpg`);
  }

  const res = await fetch(`${API}/api/capsules/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Upload fotos falló (${res.status}): ${typeof body.error === 'string' ? body.error : JSON.stringify(body)}`);
  }
  const urls = body.urls as string[];
  if (!urls?.length || urls.length !== 6) {
    throw new Error(`Se esperaban 6 URLs, recibidas: ${urls?.length ?? 0}`);
  }
  console.log(`✅ ${urls.length} fotos subidas`);
  return urls;
}

async function createCapsule(token: string, photoUrls: string[]) {
  const payload = {
    match_id: 433_123,
    match_played_at: '2024-07-14T20:00:00.000Z',
    home_team_name: 'Spain',
    away_team_name: 'England',
    home_team_crest: 'https://crests.football-data.org/760.svg',
    away_team_crest: 'https://crests.football-data.org/770.svg',
    competition_name: 'European Championship',
    home_score: 2,
    away_score: 1,
    watched_at: '2024-07-14',
    rating: 5,
    note: 'Test E2E — Con amigos fuimos campeones (6 fotos)',
    photo_urls: photoUrls,
  };

  const res = await fetch(`${API}/api/capsules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));

  if (res.status === 409) {
    console.log('⚠️  Partido ya guardado — probando PATCH en capsule existente…');
    const listRes = await fetch(`${API}/api/capsules/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    const existing = list.capsules?.find((c: { match_id: number }) => c.match_id === payload.match_id);
    if (!existing) throw new Error('409 pero no se encontró la capsule');

    const patchRes = await fetch(`${API}/api/capsules/${existing.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        watched_at: payload.watched_at,
        rating: payload.rating,
        note: payload.note,
        photo_urls: photoUrls,
      }),
    });
    const patched = await patchRes.json().catch(() => ({}));
    if (!patchRes.ok) {
      throw new Error(`PATCH falló (${patchRes.status}): ${patched.error ?? 'error'}`);
    }
    console.log('✅ Capsule actualizada:', patched.id);
    return patched;
  }

  if (!res.ok) {
    throw new Error(`Crear capsule falló (${res.status}): ${typeof body.error === 'string' ? body.error : JSON.stringify(body)}`);
  }

  console.log('✅ Capsule creada:', body.id);
  console.log('   Fotos:', body.photo_urls?.length ?? 0);
  console.log('   Nota:', body.note?.slice(0, 50));
  return body;
}

async function main() {
  console.log('🧪 Test E2E — Capsule con 6 fotos\n');
  const token = await login();
  const photoUrls = await uploadPhotos(token);
  await createCapsule(token, photoUrls);
  console.log('\n🎉 Test completado con éxito.\n');
}

main().catch((err) => {
  console.error('\n❌ Test falló:', err instanceof Error ? err.message : err);
  process.exit(1);
});

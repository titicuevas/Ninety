/**
 * Pobla la cuenta demo con perfil + partidos de ejemplo.
 * Uso: npm run seed:demo --prefix backend
 *
 * Requiere: API en marcha (npm run dev) y SUPABASE_SECRET_KEY en backend/.env
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { requireTestCredentials } from './testCredentials.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const API = process.env.API_URL ?? 'http://localhost:3001';
const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const photoDir = process.env.TEST_PHOTO_DIR ?? '/tmp/ninety-test-photos';

const DEMO_CAPSULES = [
  {
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
    note: 'Final de la Euro — con amigos en el bar del barrio. Lágrimas al final.',
    withPhotos: true,
  },
  {
    match_id: 498_765,
    match_played_at: '2024-04-21T20:00:00.000Z',
    home_team_name: 'Real Madrid CF',
    away_team_name: 'FC Barcelona',
    home_team_crest: 'https://crests.football-data.org/86.svg',
    away_team_crest: 'https://crests.football-data.org/81.svg',
    competition_name: 'La Liga',
    home_score: 3,
    away_score: 2,
    watched_at: '2024-04-21',
    rating: 4,
    note: 'Clásico intenso. Vinicius decidió en el minuto 90.',
    withPhotos: false,
  },
  {
    match_id: 512_001,
    match_played_at: '2024-02-25T18:30:00.000Z',
    home_team_name: 'Real Betis',
    away_team_name: 'Sevilla FC',
    home_team_crest: 'https://crests.football-data.org/90.svg',
    away_team_crest: 'https://crests.football-data.org/559.svg',
    competition_name: 'La Liga',
    home_score: 2,
    away_score: 2,
    watched_at: '2024-02-25',
    rating: 3,
    note: 'Derbi sevillano en el Villamarín. Ambiente espectacular.',
    withPhotos: false,
  },
  {
    match_id: 445_890,
    match_played_at: '2024-11-10T17:30:00.000Z',
    home_team_name: 'Liverpool FC',
    away_team_name: 'Manchester City FC',
    home_team_crest: 'https://crests.football-data.org/64.svg',
    away_team_crest: 'https://crests.football-data.org/65.svg',
    competition_name: 'Premier League',
    home_score: 1,
    away_score: 1,
    watched_at: '2024-11-10',
    rating: 5,
    note: 'Partidazo en Anfield. Salah y Haaland en estado de gracia.',
    withPhotos: false,
  },
  {
    match_id: 401_112,
    match_played_at: '2024-10-15T20:45:00.000Z',
    home_team_name: 'Spain',
    away_team_name: 'France',
    home_team_crest: 'https://crests.football-data.org/760.svg',
    away_team_crest: 'https://crests.football-data.org/773.svg',
    competition_name: 'UEFA Nations League',
    home_score: 2,
    away_score: 0,
    watched_at: '2024-10-15',
    rating: 4,
    note: 'Selección sólida en defensa. Oyarzabal cerró el partido.',
    withPhotos: false,
  },
] as const;

const admin = url && secretKey
  ? createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws },
    })
  : null;

async function ensureDemoUser(email: string, password: string): Promise<string> {
  if (!admin) throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY');

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users.find((u) => u.email === email);

  if (existing) {
    console.log(`ℹ️  Usuario demo ya existe: ${email}`);
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Aficionado Demo', full_name: 'Aficionado Demo' },
  });

  if (error || !data.user) throw new Error(error?.message ?? 'No se pudo crear usuario demo');
  console.log(`✅ Usuario demo creado: ${email}`);
  return data.user.id;
}

async function ensureDemoProfile(userId: string) {
  if (!admin) return;

  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      username: 'aficionado_demo',
      full_name: 'Aficionado Demo',
      favorite_team: 'Real Betis',
      country: 'España',
      city: 'Sevilla',
    },
    { onConflict: 'id' },
  );

  if (error) throw new Error(`Perfil demo: ${error.message}`);
  console.log('✅ Perfil demo listo (@aficionado_demo)');
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login falló (${res.status}): ${typeof body.error === 'string' ? body.error : '¿API en marcha?'}`);
  }
  const token = body.session?.access_token;
  if (!token) throw new Error('Login sin access_token');
  return token;
}

async function uploadPhotos(token: string): Promise<string[]> {
  const paths = [1, 2, 3, 4, 5, 6].map((n) => resolve(photoDir, `photo-${n}.jpg`));
  for (const p of paths) {
    if (!existsSync(p)) throw new Error(`Falta ${p} — ejecuta npm run generate:test-photos --prefix backend`);
  }

  const form = new FormData();
  for (let i = 0; i < paths.length; i++) {
    const buf = readFileSync(paths[i]);
    form.append('photos', new Blob([buf], { type: 'image/jpeg' }), `photo-${i + 1}.jpg`);
  }

  const res = await fetch(`${API}/api/capsules/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Upload fotos (${res.status}): ${typeof body.error === 'string' ? body.error : JSON.stringify(body)}`);
  }
  return body.urls as string[];
}

async function upsertCapsule(
  token: string,
  capsule: (typeof DEMO_CAPSULES)[number],
  photoUrls: string[],
) {
  const payload = {
    match_id: capsule.match_id,
    match_played_at: capsule.match_played_at,
    home_team_name: capsule.home_team_name,
    away_team_name: capsule.away_team_name,
    home_team_crest: capsule.home_team_crest,
    away_team_crest: capsule.away_team_crest,
    competition_name: capsule.competition_name,
    home_score: capsule.home_score,
    away_score: capsule.away_score,
    watched_at: capsule.watched_at,
    rating: capsule.rating,
    note: capsule.note,
    photo_urls: capsule.withPhotos ? photoUrls : [],
  };

  const res = await fetch(`${API}/api/capsules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));

  if (res.status === 409) {
    const listRes = await fetch(`${API}/api/capsules/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    const existing = list.capsules?.find((c: { match_id: number }) => c.match_id === capsule.match_id);
    if (!existing) throw new Error(`409 sin capsule para match ${capsule.match_id}`);

    const patchRes = await fetch(`${API}/api/capsules/${existing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        watched_at: payload.watched_at,
        rating: payload.rating,
        note: payload.note,
        photo_urls: payload.photo_urls,
      }),
    });
    if (!patchRes.ok) {
      const patched = await patchRes.json().catch(() => ({}));
      throw new Error(`PATCH (${patchRes.status}): ${patched.error ?? 'error'}`);
    }
    console.log(`   ↻ ${capsule.home_team_name} vs ${capsule.away_team_name}`);
    return;
  }

  if (!res.ok) {
    throw new Error(`POST (${res.status}): ${typeof body.error === 'string' ? body.error : JSON.stringify(body)}`);
  }

  console.log(`   + ${capsule.home_team_name} vs ${capsule.away_team_name}`);
}

async function main() {
  console.log('🌱 Seed demo — Ninety\n');

  const { email, password } = requireTestCredentials();

  const userId = await ensureDemoUser(email, password);
  await ensureDemoProfile(userId);

  const token = await login(email, password);
  console.log('✅ Login demo OK');

  let photoUrls: string[] = [];
  const needsPhotos = DEMO_CAPSULES.some((c) => c.withPhotos);
  if (needsPhotos) {
    photoUrls = await uploadPhotos(token);
    console.log(`✅ ${photoUrls.length} fotos subidas`);
  }

  console.log('\n📦 Capsules de ejemplo:');
  for (const capsule of DEMO_CAPSULES) {
    await upsertCapsule(token, capsule, photoUrls);
  }

  const { count } = await admin!.from('capsules').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  console.log(`\n🎉 Demo listo — ${count ?? 0} partidos para ${email}`);
  console.log(`   Perfil: http://localhost:5173/u/aficionado_demo`);
  console.log(`   Login:  ${email} (TEST_USER_PASSWORD en backend/.env)\n`);
}

main().catch((err) => {
  console.error('\n❌ Seed falló:', err instanceof Error ? err.message : err);
  process.exit(1);
});

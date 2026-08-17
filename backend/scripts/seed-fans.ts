/**
 * Crea ≥20 aficionados de prueba con perfil, capsules y algunos follows.
 * Uso: npm run seed:fans --prefix backend
 *
 * Requiere SUPABASE_SECRET_KEY y TEST_USER_PASSWORD (o DEMO_FANS_PASSWORD) en backend/.env.
 * No necesita la API en marcha.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { requireTestCredentials } from './testCredentials.js';
import {
  DEMO_FEATURED_COLLECTION_NAME,
  DEMO_FEATURED_COLLECTION_SLUG,
  demoFeaturedSocialActions,
  demoFollowedSocialActions,
  demoSeedCommentBody,
  isE2eCreatedCapsuleNote,
  isE2eLeftoverCollectionName,
  isE2eLeftoverNote,
} from '../src/lib/demoSocialSeed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = url && secretKey
  ? createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws },
    })
  : null;

type FanSeed = {
  username: string;
  display_name: string;
  email: string;
  favorite_team: string;
  city: string;
  country: string;
  bio: string;
  /** Foto de perfil: escudo del equipo favorito. */
  avatar_url: string;
  /** Índices 0–4 en MATCH_POOL para sus capsules (1–3 partidos). */
  matchIndexes: number[];
};

/** Escudo PNG de football-data.org (mismo CDN que las Capsules). */
function fdCrest(id: number, ext: 'png' | 'svg' = 'png'): string {
  return `https://crests.football-data.org/${id}.${ext}`;
}

/** Fallback PNG (CONMEBOL / selecciones sin PNG en football-data). */
function apiSportsCrest(id: number): string {
  return `https://media.api-sports.io/football/teams/${id}.png`;
}

/** Partidos reutilizables — match_id único por usuario vía offset. */
const MATCH_POOL = [
  {
    home_team_name: 'Real Betis',
    away_team_name: 'Sevilla FC',
    home_team_crest: 'https://crests.football-data.org/90.svg',
    away_team_crest: 'https://crests.football-data.org/559.svg',
    competition_name: 'La Liga',
    match_played_at: '2024-02-25T18:30:00.000Z',
    home_score: 2,
    away_score: 2,
    watched_at: '2024-02-25',
    rating: 4,
    note: 'Derbi en el Villamarín — ambiente de locos.',
  },
  {
    home_team_name: 'Real Madrid CF',
    away_team_name: 'FC Barcelona',
    home_team_crest: 'https://crests.football-data.org/86.svg',
    away_team_crest: 'https://crests.football-data.org/81.svg',
    competition_name: 'La Liga',
    match_played_at: '2024-04-21T20:00:00.000Z',
    home_score: 3,
    away_score: 2,
    watched_at: '2024-04-21',
    rating: 5,
    note: 'Clásico para el recuerdo.',
  },
  {
    home_team_name: 'Liverpool FC',
    away_team_name: 'Manchester City FC',
    home_team_crest: 'https://crests.football-data.org/64.svg',
    away_team_crest: 'https://crests.football-data.org/65.svg',
    competition_name: 'Premier League',
    match_played_at: '2024-11-10T17:30:00.000Z',
    home_score: 1,
    away_score: 1,
    watched_at: '2024-11-10',
    rating: 4,
    note: 'Anfield a tope. Empate justo.',
  },
  {
    home_team_name: 'FC Bayern München',
    away_team_name: 'Borussia Dortmund',
    home_team_crest: 'https://crests.football-data.org/5.svg',
    away_team_crest: 'https://crests.football-data.org/4.svg',
    competition_name: 'Bundesliga',
    match_played_at: '2024-03-30T16:30:00.000Z',
    home_score: 2,
    away_score: 1,
    watched_at: '2024-03-30',
    rating: 4,
    note: 'Der Klassiker en casa de un amigo.',
  },
  {
    home_team_name: 'Argentina',
    away_team_name: 'Brazil',
    home_team_crest: 'https://crests.football-data.org/762.svg',
    away_team_crest: 'https://crests.football-data.org/764.svg',
    competition_name: 'World Cup Qualifiers',
    match_played_at: '2024-09-05T00:00:00.000Z',
    home_score: 1,
    away_score: 0,
    watched_at: '2024-09-04',
    rating: 5,
    note: 'Superclásico sudamericano. Noche larga.',
  },
] as const;

const FANS: FanSeed[] = [
  {
    username: 'maria_betica',
    display_name: 'María G.',
    email: 'fan01@ninety.app',
    favorite_team: 'Real Betis',
    city: 'Sevilla',
    country: 'España',
    bio: 'Verdiblanca de corazón. Derbis > todo.',
    avatar_url: fdCrest(90),
    matchIndexes: [0, 1],
  },
  {
    username: 'paco_sevilla',
    display_name: 'Paco R.',
    email: 'fan02@ninety.app',
    favorite_team: 'Sevilla FC',
    city: 'Sevilla',
    country: 'España',
    bio: 'Nervionense. Sánchez-Pizjuán es mi templo.',
    avatar_url: fdCrest(559),
    matchIndexes: [0, 2],
  },
  {
    username: 'lucia_madrid',
    display_name: 'Lucía M.',
    email: 'fan03@ninety.app',
    favorite_team: 'Real Madrid CF',
    city: 'Madrid',
    country: 'España',
    bio: 'Hala Madrid. Colecciono finales.',
    avatar_url: fdCrest(86),
    matchIndexes: [1, 3],
  },
  {
    username: 'jordi_cule',
    display_name: 'Jordi P.',
    email: 'fan04@ninety.app',
    favorite_team: 'FC Barcelona',
    city: 'Barcelona',
    country: 'España',
    bio: 'Més que un club. La Masia en el ADN.',
    avatar_url: fdCrest(81),
    matchIndexes: [1],
  },
  {
    username: 'ana_atleti',
    display_name: 'Ana V.',
    email: 'fan05@ninety.app',
    favorite_team: 'Atlético de Madrid',
    city: 'Madrid',
    country: 'España',
    bio: 'Coraje y corazón rojiblanco.',
    avatar_url: fdCrest(78),
    matchIndexes: [1, 2, 3],
  },
  {
    username: 'carlos_valencia',
    display_name: 'Carlos L.',
    email: 'fan06@ninety.app',
    favorite_team: 'Valencia CF',
    city: 'Valencia',
    country: 'España',
    bio: 'Mestalla siempre. Amunt València.',
    avatar_url: fdCrest(95),
    matchIndexes: [0, 2],
  },
  {
    username: 'inaki_leon',
    display_name: 'Iñaki A.',
    email: 'fan07@ninety.app',
    favorite_team: 'Athletic Club',
    city: 'Bilbao',
    country: 'España',
    bio: 'Solo leones de San Mamés.',
    avatar_url: fdCrest(77),
    matchIndexes: [2],
  },
  {
    username: 'emma_kop',
    display_name: 'Emma T.',
    email: 'fan08@ninety.app',
    favorite_team: 'Liverpool FC',
    city: 'Liverpool',
    country: 'Reino Unido',
    bio: 'YNWA. Anfield en la sangre.',
    avatar_url: fdCrest(64),
    matchIndexes: [2, 3],
  },
  {
    username: 'james_city',
    display_name: 'James H.',
    email: 'fan09@ninety.app',
    favorite_team: 'Manchester City FC',
    city: 'Manchester',
    country: 'Reino Unido',
    bio: 'Etihad regular. Pep ball believer.',
    avatar_url: fdCrest(65),
    matchIndexes: [2],
  },
  {
    username: 'sophie_gooner',
    display_name: 'Sophie W.',
    email: 'fan10@ninety.app',
    favorite_team: 'Arsenal FC',
    city: 'London',
    country: 'Reino Unido',
    bio: 'North London forever.',
    avatar_url: fdCrest(57),
    matchIndexes: [2, 4],
  },
  {
    username: 'hans_bayern',
    display_name: 'Hans K.',
    email: 'fan11@ninety.app',
    favorite_team: 'FC Bayern München',
    city: 'München',
    country: 'Alemania',
    bio: 'Mia san mia desde la Allianz.',
    avatar_url: fdCrest(5),
    matchIndexes: [3],
  },
  {
    username: 'lena_bvb',
    display_name: 'Lena S.',
    email: 'fan12@ninety.app',
    favorite_team: 'Borussia Dortmund',
    city: 'Dortmund',
    country: 'Alemania',
    bio: 'Die Gelbe Wand. Signal Iduna Park.',
    avatar_url: fdCrest(4),
    matchIndexes: [3, 4],
  },
  {
    username: 'pierre_psg',
    display_name: 'Pierre D.',
    email: 'fan13@ninety.app',
    favorite_team: 'Paris Saint-Germain FC',
    city: 'Paris',
    country: 'Francia',
    bio: 'Parc des Princes los miércoles.',
    avatar_url: fdCrest(524),
    matchIndexes: [3],
  },
  {
    username: 'marco_milan',
    display_name: 'Marco B.',
    email: 'fan14@ninety.app',
    favorite_team: 'AC Milan',
    city: 'Milano',
    country: 'Italia',
    bio: 'Forza Milan. San Siro nights.',
    avatar_url: fdCrest(98),
    matchIndexes: [1, 4],
  },
  {
    username: 'giulia_inter',
    display_name: 'Giulia F.',
    email: 'fan15@ninety.app',
    favorite_team: 'Inter Milan',
    city: 'Milano',
    country: 'Italia',
    bio: 'Nerazzurra. Derby della Madonnina fan.',
    avatar_url: fdCrest(108),
    matchIndexes: [4],
  },
  {
    username: 'luca_juve',
    display_name: 'Luca R.',
    email: 'fan16@ninety.app',
    favorite_team: 'Juventus FC',
    city: 'Torino',
    country: 'Italia',
    bio: 'Fino alla fine. Vecchia Signora.',
    avatar_url: fdCrest(109),
    matchIndexes: [1, 2],
  },
  {
    username: 'tomas_boca',
    display_name: 'Tomás M.',
    email: 'fan17@ninety.app',
    favorite_team: 'CA Boca Juniors',
    city: 'Buenos Aires',
    country: 'Argentina',
    bio: 'La Bombonera es otra liga.',
    avatar_url: apiSportsCrest(451),
    matchIndexes: [4, 0],
  },
  {
    username: 'vale_river',
    display_name: 'Valentina S.',
    email: 'fan18@ninety.app',
    favorite_team: 'CA River Plate',
    city: 'Buenos Aires',
    country: 'Argentina',
    bio: 'Millonaria. Superclásico vivido en vivo.',
    avatar_url: apiSportsCrest(435),
    matchIndexes: [4],
  },
  {
    username: 'rafa_flamengo',
    display_name: 'Rafa O.',
    email: 'fan19@ninety.app',
    favorite_team: 'CR Flamengo',
    city: 'Rio de Janeiro',
    country: 'Brasil',
    bio: 'Uma vez Flamengo, sempre Flamengo.',
    avatar_url: fdCrest(1783),
    matchIndexes: [4, 3],
  },
  {
    username: 'julia_palmeiras',
    display_name: 'Julia C.',
    email: 'fan20@ninety.app',
    favorite_team: 'SE Palmeiras',
    city: 'São Paulo',
    country: 'Brasil',
    bio: 'Verdão. Allianz Parque é casa.',
    avatar_url: fdCrest(1769),
    matchIndexes: [3],
  },
  {
    username: 'diego_betis',
    display_name: 'Diego F.',
    email: 'fan21@ninety.app',
    favorite_team: 'Real Betis',
    city: 'Sevilla',
    country: 'España',
    bio: 'Otra bética más en Triana.',
    avatar_url: fdCrest(90),
    matchIndexes: [0, 1, 2],
  },
  {
    username: 'nora_espana',
    display_name: 'Nora C.',
    email: 'fan22@ninety.app',
    favorite_team: 'Spain',
    city: 'Sevilla',
    country: 'España',
    bio: 'Selección primero. Euro 2024 core memory.',
    avatar_url: fdCrest(760, 'svg'),
    matchIndexes: [4, 1],
  },
  {
    username: 'mike_usa',
    display_name: 'Mike D.',
    email: 'fan23@ninety.app',
    favorite_team: 'Real Betis',
    city: 'Sevilla',
    country: 'España',
    bio: 'Expat en Sevilla. Aprendí a amar el derbi.',
    avatar_url: fdCrest(90),
    matchIndexes: [0],
  },
  {
    username: 'sara_coleccion',
    display_name: 'Sara N.',
    email: 'fan24@ninety.app',
    favorite_team: 'Real Madrid CF',
    city: 'Madrid',
    country: 'España',
    bio: 'Diario de partidos desde 2018.',
    avatar_url: fdCrest(86),
    matchIndexes: [1, 2, 3, 4],
  },
];

function fanPassword(): string {
  return process.env.DEMO_FANS_PASSWORD ?? requireTestCredentials().password;
}

async function findUserByEmail(email: string): Promise<string | null> {
  if (!admin) return null;

  let page = 1;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureFanUser(fan: FanSeed, password: string): Promise<string> {
  if (!admin) throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY');

  const existingId = await findUserByEmail(fan.email);
  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password,
      email_confirm: true,
      user_metadata: { display_name: fan.display_name, full_name: fan.display_name },
    });
    if (error) throw new Error(`Actualizar ${fan.username}: ${error.message}`);
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: fan.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: fan.display_name, full_name: fan.display_name },
  });
  if (error || !data.user) throw new Error(error?.message ?? `No se pudo crear ${fan.email}`);
  return data.user.id;
}

async function ensureFanProfile(userId: string, fan: FanSeed) {
  if (!admin) return;

  const { error } = await admin.from('profiles').upsert(
    {
      id: userId,
      username: fan.username,
      display_name: fan.display_name,
      avatar_url: fan.avatar_url,
      favorite_team: fan.favorite_team,
      country: fan.country,
      city: fan.city,
      bio: fan.bio,
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`Perfil @${fan.username}: ${error.message}`);
}

async function seedFanCapsules(userId: string, fanIndex: number, fan: FanSeed) {
  if (!admin) return;

  const matchIdBase = 910_000 + fanIndex * 10;

  for (let i = 0; i < fan.matchIndexes.length; i++) {
    const template = MATCH_POOL[fan.matchIndexes[i]!];
    const { error } = await admin.from('capsules').upsert(
      {
        user_id: userId,
        match_id: matchIdBase + i,
        match_played_at: template.match_played_at,
        home_team_name: template.home_team_name,
        away_team_name: template.away_team_name,
        home_team_crest: template.home_team_crest,
        away_team_crest: template.away_team_crest,
        competition_name: template.competition_name,
        home_score: template.home_score,
        away_score: template.away_score,
        watched_at: template.watched_at,
        rating: template.rating,
        note: template.note,
        photo_urls: [],
        is_public: true,
      },
      { onConflict: 'user_id,match_id' },
    );
    if (error) throw new Error(`Capsule @${fan.username}: ${error.message}`);
  }
}

async function ensureFollow(followerId: string, followingId: string) {
  if (!admin || followerId === followingId) return;

  const { error } = await admin.from('user_follows').upsert(
    { follower_id: followerId, following_id: followingId },
    { onConflict: 'follower_id,following_id', ignoreDuplicates: true },
  );
  if (error) throw new Error(`Follow ${followerId} → ${followingId}: ${error.message}`);
}

async function lookupDemoUserId(): Promise<string | null> {
  if (!admin) return null;

  const demoUsername = process.env.DEMO_USERNAME ?? 'aficionado_demo';
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('username', demoUsername)
    .maybeSingle();
  if (error) throw new Error(`Demo lookup: ${error.message}`);
  return data?.id ?? null;
}

async function seedFollows(fanIds: string[], demoUserId: string | null) {
  if (!admin || fanIds.length === 0) return;

  // Demo sigue a los 6 primeros (descubrimiento / listas).
  if (demoUserId) {
    for (const id of fanIds.slice(0, 6)) {
      await ensureFollow(demoUserId, id);
    }
    // 10 fans siguen al demo (feed de actividad).
    for (const id of fanIds.slice(6, 16)) {
      await ensureFollow(id, demoUserId);
    }
  }

  // Red cruzada entre fans (pares consecutivos + algunos triángulos).
  for (let i = 0; i < fanIds.length - 1; i += 2) {
    await ensureFollow(fanIds[i]!, fanIds[i + 1]!);
  }
  for (let i = 0; i < fanIds.length - 2; i += 3) {
    await ensureFollow(fanIds[i]!, fanIds[i + 2]!);
  }
}

async function firstCapsuleId(userId: string): Promise<string | null> {
  if (!admin) return null;
  const { data, error } = await admin
    .from('capsules')
    .select('id')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Capsule de ${userId}: ${error.message}`);
  return (data?.id as string | undefined) ?? null;
}

async function ensureShowcaseCollection(ownerId: string, capsuleId: string): Promise<string> {
  if (!admin) throw new Error('Admin requerido');

  const slug = 'derbis-seed';
  const { data: existing, error: existingError } = await admin
    .from('collections')
    .select('id')
    .eq('user_id', ownerId)
    .eq('slug', slug)
    .maybeSingle();
  if (existingError) throw new Error(`Lista seed lookup: ${existingError.message}`);

  let collectionId = existing?.id as string | undefined;
  if (!collectionId) {
    const { data, error } = await admin
      .from('collections')
      .insert({
        user_id: ownerId,
        name: 'Derbis',
        slug,
        description: 'Clásicos y derbis para el seed social.',
        is_public: true,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`Lista seed: ${error?.message ?? 'sin id'}`);
    collectionId = data.id as string;
  }

  const { error: itemError } = await admin.from('collection_items').upsert(
    { collection_id: collectionId, capsule_id: capsuleId, position: 0 },
    { onConflict: 'collection_id,capsule_id' },
  );
  if (itemError) throw new Error(`Ítem lista seed: ${itemError.message}`);
  return collectionId;
}

async function ensureSeedComment(
  table: 'capsule_comments' | 'collection_comments',
  userId: string,
  targetColumn: 'capsule_id' | 'collection_id',
  targetId: string,
  body: string,
) {
  if (!admin) return;
  const { data: existing, error: lookupError } = await admin
    .from(table)
    .select('id')
    .eq('user_id', userId)
    .eq(targetColumn, targetId)
    .eq('body', body)
    .limit(1);
  if (lookupError) throw new Error(`Lookup comentario seed: ${lookupError.message}`);
  if ((existing ?? []).length > 0) return;

  const { error } = await admin.from(table).insert({
    user_id: userId,
    [targetColumn]: targetId,
    body,
  });
  if (error) throw new Error(`Comentario seed: ${error.message}`);
}

async function seedFanSocial(fanIds: string[]) {
  if (!admin || fanIds.length < 6) return;

  const ownerId = fanIds[0]!;
  const ownerCapsuleId = await firstCapsuleId(ownerId);
  if (!ownerCapsuleId) return;

  const collectionId = await ensureShowcaseCollection(ownerId, ownerCapsuleId);
  const capsuleByFan = new Map<number, string>();
  capsuleByFan.set(0, ownerCapsuleId);

  for (const action of demoFollowedSocialActions()) {
    const actorId = fanIds[action.actorIndex];
    const targetId = fanIds[action.targetIndex];
    if (!actorId || !targetId) continue;

    if (action.kind.startsWith('capsule_')) {
      let capsuleId = capsuleByFan.get(action.targetIndex);
      if (!capsuleId) {
        capsuleId = (await firstCapsuleId(targetId)) ?? undefined;
        if (capsuleId) capsuleByFan.set(action.targetIndex, capsuleId);
      }
      if (!capsuleId) continue;
      if (action.kind === 'capsule_like') {
        const { error } = await admin.from('capsule_likes').upsert(
          { user_id: actorId, capsule_id: capsuleId },
          { onConflict: 'user_id,capsule_id', ignoreDuplicates: true },
        );
        if (error) throw new Error(`Like Capsule seed: ${error.message}`);
      } else {
        await ensureSeedComment(
          'capsule_comments',
          actorId,
          'capsule_id',
          capsuleId,
          demoSeedCommentBody('capsule'),
        );
      }
      continue;
    }

    if (action.targetIndex !== 0) continue;
    if (action.kind === 'collection_like') {
      const { error } = await admin.from('collection_likes').upsert(
        { user_id: actorId, collection_id: collectionId },
        { onConflict: 'user_id,collection_id', ignoreDuplicates: true },
      );
      if (error) throw new Error(`Like lista seed: ${error.message}`);
    } else {
      await ensureSeedComment(
        'collection_comments',
        actorId,
        'collection_id',
        collectionId,
        demoSeedCommentBody('collection'),
      );
    }
  }
}

async function cleanupDemoE2eCollections(demoUserId: string | null) {
  if (!admin || !demoUserId) return;
  const { data, error } = await admin
    .from('collections')
    .select('id, name')
    .eq('user_id', demoUserId);
  if (error) throw new Error(`Cleanup E2E lookup: ${error.message}`);
  const junk = (data ?? []).filter((row) => isE2eLeftoverCollectionName(String(row.name ?? '')));
  if (junk.length === 0) return;
  const { error: deleteError } = await admin
    .from('collections')
    .delete()
    .in(
      'id',
      junk.map((row) => row.id as string),
    );
  if (deleteError) throw new Error(`Cleanup E2E delete: ${deleteError.message}`);
  console.log(`   Limpiadas ${junk.length} lista(s) E2E del perfil demo`);
}

async function cleanupDemoE2eNotes(demoUserId: string | null) {
  if (!admin || !demoUserId) return;
  const { data, error } = await admin
    .from('capsules')
    .select('id, note')
    .eq('user_id', demoUserId);
  if (error) throw new Error(`Cleanup E2E notes lookup: ${error.message}`);
  const leftover = (data ?? []).filter((row) => isE2eLeftoverNote(row.note as string | null));
  const createdIds = leftover
    .filter((row) => isE2eCreatedCapsuleNote(row.note as string | null))
    .map((row) => row.id as string);
  const editedIds = leftover
    .filter((row) => !isE2eCreatedCapsuleNote(row.note as string | null))
    .map((row) => row.id as string);

  if (createdIds.length > 0) {
    const { error: deleteError } = await admin.from('capsules').delete().in('id', createdIds);
    if (deleteError) throw new Error(`Cleanup E2E created capsules: ${deleteError.message}`);
    console.log(`   Borradas ${createdIds.length} Capsule(s) E2E del perfil demo`);
  }
  if (editedIds.length > 0) {
    const { error: updateError } = await admin.from('capsules').update({ note: null }).in('id', editedIds);
    if (updateError) throw new Error(`Cleanup E2E notes: ${updateError.message}`);
    console.log(`   Limpiadas ${editedIds.length} reseña(s) E2E del perfil demo`);
  }
}

async function ensureDemoFeaturedCollection(demoUserId: string | null) {
  if (!admin || !demoUserId) return;

  const { data: capsules, error: capsulesError } = await admin
    .from('capsules')
    .select('id')
    .eq('user_id', demoUserId)
    .eq('is_public', true)
    .order('watched_at', { ascending: false })
    .limit(5);
  if (capsulesError) throw new Error(`Demo featured capsules: ${capsulesError.message}`);
  const capsuleIds = (capsules ?? []).map((row) => row.id as string).filter(Boolean);
  if (capsuleIds.length === 0) return;

  const { data: existing, error: existingError } = await admin
    .from('collections')
    .select('id')
    .eq('user_id', demoUserId)
    .eq('slug', DEMO_FEATURED_COLLECTION_SLUG)
    .maybeSingle();
  if (existingError) throw new Error(`Demo featured lookup: ${existingError.message}`);

  let collectionId = existing?.id as string | undefined;
  if (!collectionId) {
    const { data, error } = await admin
      .from('collections')
      .insert({
        user_id: demoUserId,
        name: DEMO_FEATURED_COLLECTION_NAME,
        slug: DEMO_FEATURED_COLLECTION_SLUG,
        description: 'Partidos que no me canso de revivir.',
        is_public: true,
        cover_capsule_id: capsuleIds[0]!,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`Demo featured insert: ${error?.message ?? 'sin id'}`);
    collectionId = data.id as string;
  } else {
    const { error } = await admin
      .from('collections')
      .update({
        name: DEMO_FEATURED_COLLECTION_NAME,
        description: 'Partidos que no me canso de revivir.',
        is_public: true,
        cover_capsule_id: capsuleIds[0]!,
      })
      .eq('id', collectionId);
    if (error) throw new Error(`Demo featured update: ${error.message}`);
  }

  const { error: itemsError } = await admin.from('collection_items').upsert(
    capsuleIds.map((capsuleId, position) => ({
      collection_id: collectionId,
      capsule_id: capsuleId,
      position,
    })),
    { onConflict: 'collection_id,capsule_id' },
  );
  if (itemsError) throw new Error(`Demo featured items: ${itemsError.message}`);

  const { error: profileError } = await admin
    .from('profiles')
    .update({ featured_collection_id: collectionId })
    .eq('id', demoUserId);
  if (profileError) throw new Error(`Demo featured pin: ${profileError.message}`);
  console.log(`   Lista destacada «${DEMO_FEATURED_COLLECTION_NAME}» en el perfil demo`);
  return collectionId;
}

async function seedDemoFeaturedSocial(demoUserId: string | null, fanIds: string[]) {
  if (!admin || !demoUserId || fanIds.length < 6) return;

  const { data: collection, error: lookupError } = await admin
    .from('collections')
    .select('id')
    .eq('user_id', demoUserId)
    .eq('slug', DEMO_FEATURED_COLLECTION_SLUG)
    .maybeSingle();
  if (lookupError) throw new Error(`Demo featured social lookup: ${lookupError.message}`);
  const collectionId = collection?.id as string | undefined;
  if (!collectionId) return;

  for (const action of demoFeaturedSocialActions()) {
    const actorId = fanIds[action.actorIndex];
    if (!actorId) continue;
    if (action.kind === 'collection_like') {
      const { error } = await admin.from('collection_likes').upsert(
        { user_id: actorId, collection_id: collectionId },
        { onConflict: 'user_id,collection_id', ignoreDuplicates: true },
      );
      if (error) throw new Error(`Like Favoritos seed: ${error.message}`);
    } else {
      await ensureSeedComment(
        'collection_comments',
        actorId,
        'collection_id',
        collectionId,
        demoSeedCommentBody('collection'),
      );
    }
  }
  console.log(`   Likes/comentarios en «${DEMO_FEATURED_COLLECTION_NAME}»`);
}

async function main() {
  if (!admin) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env');
  }

  const password = fanPassword();
  console.log(`🌱 Seed fans — ${FANS.length} aficionados de prueba\n`);

  const fanIds: string[] = [];

  for (let i = 0; i < FANS.length; i++) {
    const fan = FANS[i]!;
    const userId = await ensureFanUser(fan, password);
    await ensureFanProfile(userId, fan);
    await seedFanCapsules(userId, i, fan);
    fanIds.push(userId);
    console.log(`✅ @${fan.username} — ${fan.matchIndexes.length} partido(s) · escudo`);
  }

  const demoUserId = await lookupDemoUserId();
  await seedFollows(fanIds, demoUserId);
  await seedFanSocial(fanIds);
  await cleanupDemoE2eCollections(demoUserId);
  await cleanupDemoE2eNotes(demoUserId);
  await ensureDemoFeaturedCollection(demoUserId);
  await seedDemoFeaturedSocial(demoUserId, fanIds);

  console.log('\n📋 Resumen');
  console.log(`   Aficionados: ${FANS.length}`);
  console.log(`   Contraseña:  DEMO_FANS_PASSWORD o TEST_USER_PASSWORD en backend/.env`);
  console.log(`   Emails:      fan01@ninety.app … fan${String(FANS.length).padStart(2, '0')}@ninety.app`);
  if (demoUserId) {
    console.log(`   Demo (@${process.env.DEMO_USERNAME ?? 'aficionado_demo'}) enlazado con follows + likes/comentarios + Favoritos`);
  } else {
    console.log('   ℹ️  Usuario demo no encontrado — ejecuta npm run seed:demo para enlazar follows');
  }
  console.log('\n   Perfiles de ejemplo:');
  for (const fan of FANS.slice(0, 5)) {
    console.log(`   • http://localhost:5173/u/${fan.username}`);
  }
  console.log(`   … y ${FANS.length - 5} más\n`);
}

main().catch((err) => {
  console.error('\n❌ Seed fans falló:', err instanceof Error ? err.message : err);
  process.exit(1);
});

/**
 * Verifica y alinea la tabla capsules + storage en Supabase.
 * Uso: npm run verify:capsules --prefix backend
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const databaseUrl = process.env.SUPABASE_DB_URL;

if (!url || !secretKey) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en backend/.env');
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const REQUIRED_COLUMNS = [
  'id',
  'user_id',
  'match_id',
  'match_played_at',
  'home_team_name',
  'away_team_name',
  'home_team_crest',
  'away_team_crest',
  'competition_name',
  'home_score',
  'away_score',
  'watched_at',
  'rating',
  'note',
  'photo_urls',
  'created_at',
  'updated_at',
] as const;

async function runSqlFile(relativePath: string, label: string) {
  if (!databaseUrl) return false;

  let pg: typeof import('pg');
  try {
    pg = await import('pg');
  } catch {
    console.warn('⚠️  Instala pg para aplicar SQL automáticamente (opcional).');
    return false;
  }

  const sql = readFileSync(resolve(__dirname, relativePath), 'utf8');
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query(sql);
    console.log(`✅ ${label}`);
    return true;
  } finally {
    await client.end();
  }
}

async function verifyColumnAccess() {
  const selectList = REQUIRED_COLUMNS.join(', ');
  const { error } = await admin.from('capsules').select(selectList).limit(0);

  if (error) {
    console.error('❌ Columnas de capsules:', error.message);
    console.error('\n👉 Ejecuta: supabase/migrations/20250705170000_capsules_align_columns.sql\n');
    return false;
  }

  console.log('✅ Todas las columnas de capsules accesibles');
  return true;
}

async function verifyMatchIdType(): Promise<boolean> {
  const { data: users, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) {
    console.warn('⚠️  No se pudo comprobar match_id:', listError.message);
    return true;
  }

  const demo = users.users.find((u) => u.email === 'demo@ninety.app');
  if (!demo) {
    console.warn('⚠️  Usuario demo no encontrado; omitiendo prueba de match_id');
    return true;
  }

  const probe = {
    user_id: demo.id,
    match_id: 1,
    home_team_name: '__probe__',
    away_team_name: '__probe__',
    watched_at: '2024-01-01',
  };

  const { data, error } = await admin.from('capsules').insert(probe).select('id').single();

  if (error?.message.includes('invalid input syntax for type uuid')) {
    console.error('❌ match_id es UUID en Supabase; debe ser integer (IDs de football-data.org)');
    console.error('\n👉 Ejecuta en SQL Editor: supabase/migrations/20250705190000_capsules_match_id_integer.sql\n');
    return false;
  }

  if (data?.id) {
    await admin.from('capsules').delete().eq('id', data.id);
  }

  console.log('✅ match_id acepta enteros');
  return true;
}

async function main() {
  console.log('🔍 Comprobando capsules en Supabase…\n');

  const { error: selectError } = await admin.from('capsules').select('id').limit(1);

  if (selectError) {
    console.error('❌ La tabla capsules no es accesible:', selectError.message);
    console.error('\n👉 Ejecuta: supabase/migrations/20250705120000_capsules.sql\n');
    process.exit(1);
  }

  console.log('✅ Tabla capsules existe');

  let columnsOk = await verifyColumnAccess();

  if (!columnsOk && databaseUrl) {
    console.log('\n🔧 Aplicando migración de alineación…');
    await runSqlFile('../../supabase/migrations/20250705180000_capsules_full_schema.sql', 'Esquema completo aplicado');
    columnsOk = await verifyColumnAccess();
  }

  if (!columnsOk) {
    process.exit(1);
  }

  let matchIdOk = await verifyMatchIdType();

  if (!matchIdOk && databaseUrl) {
    console.log('\n🔧 Corrigiendo tipo de match_id…');
    await runSqlFile('../../supabase/migrations/20250705190000_capsules_match_id_integer.sql', 'match_id → integer');
    matchIdOk = await verifyMatchIdType();
  }

  if (!matchIdOk) {
    process.exit(1);
  }

  if (databaseUrl) {
    try {
      await runSqlFile('../../supabase/migrations/20250705130000_capsules_feed.sql', 'Política feed aplicada');
      await runSqlFile('../../supabase/migrations/20250705160000_capsule_photo_urls.sql', 'Migración photo_urls aplicada');
    } catch (err) {
      console.warn('⚠️  SQL adicional:', (err as Error).message);
    }
  }

  const { count } = await admin.from('capsules').select('*', { count: 'exact', head: true });
  console.log(`✅ Capsules en base de datos: ${count ?? 0}`);

  const { error: likesError } = await admin.from('capsule_likes').select('capsule_id').limit(0);
  if (likesError) {
    console.warn('\n⚠️  Tabla capsule_likes no disponible:', likesError.message);
    console.warn('👉 Ejecuta en SQL Editor: supabase/migrations/20250711200000_capsule_likes.sql');
  } else {
    console.log('✅ Tabla capsule_likes accesible');
  }

  const { error: commentsError } = await admin.from('capsule_comments').select('id').limit(0);
  if (commentsError) {
    console.warn('\n⚠️  Tabla capsule_comments no disponible:', commentsError.message);
    console.warn('👉 Ejecuta en SQL Editor: supabase/migrations/20250711210000_capsule_comments.sql');
  } else {
    console.log('✅ Tabla capsule_comments accesible');
  }

  console.log('\n🎉 Verificación completada.\n');
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});

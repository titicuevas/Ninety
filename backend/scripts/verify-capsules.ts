/**
 * Verifica migraciones de capsules en Supabase y aplica la del feed si falta.
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
  'home_team_name',
  'away_team_name',
  'watched_at',
  'rating',
  'note',
  'created_at',
] as const;

async function applyFeedMigrationWithPg() {
  if (!databaseUrl) return false;

  let pg: typeof import('pg');
  try {
    pg = await import('pg');
  } catch {
    console.warn('⚠️  Instala pg para aplicar SQL automáticamente (opcional).');
    return false;
  }

  const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20250705130000_capsules_feed.sql'), 'utf8');
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Migración feed aplicada vía SUPABASE_DB_URL');
    return true;
  } finally {
    await client.end();
  }
}

async function verifyProfiles() {
  const { error } = await admin.from('profiles').select('id, username, full_name').limit(1);
  if (error) {
    console.error('❌ Tabla profiles:', error.message);
    process.exit(1);
  }
  console.log('✅ Tabla profiles accesible');
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

  const { data: sample } = await admin.from('capsules').select('*').limit(1);
  if (sample && sample.length > 0) {
    const row = sample[0] as Record<string, unknown>;
    const missing = REQUIRED_COLUMNS.filter((col) => !(col in row));
    if (missing.length > 0) {
      console.error('❌ Faltan columnas:', missing.join(', '));
      process.exit(1);
    }
    console.log('✅ Columnas requeridas presentes');
  } else {
    console.log('✅ Estructura OK (tabla vacía)');
  }

  await verifyProfiles();

  const { count } = await admin.from('capsules').select('*', { count: 'exact', head: true });
  console.log(`✅ Capsules en base de datos: ${count ?? 0}`);

  if (databaseUrl) {
    try {
      await applyFeedMigrationWithPg();
    } catch (err) {
      console.warn('⚠️  No se pudo aplicar feed automáticamente:', (err as Error).message);
    }
  } else {
    console.log('\nℹ️  Añade SUPABASE_DB_URL en backend/.env para aplicar SQL automáticamente.');
    console.log('   O ejecuta manualmente: supabase/migrations/20250705130000_capsules_feed.sql');
  }

  console.log('\n🎉 Verificación completada.\n');
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});

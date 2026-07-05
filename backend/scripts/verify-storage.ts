/**
 * Crea el bucket capsule-photos y aplica políticas de Storage si faltan.
 * Uso: npm run verify:storage --prefix backend
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const BUCKET = 'capsule-photos';
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

async function ensureBucket() {
  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) {
    throw new Error(`No se pudo listar buckets: ${error.message}`);
  }

  const exists = buckets?.some((bucket) => bucket.name === BUCKET || bucket.id === BUCKET);
  if (exists) {
    console.log(`✅ Bucket "${BUCKET}" ya existe`);
    return;
  }

  const { error: createError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  if (createError) {
    throw new Error(`No se pudo crear el bucket: ${createError.message}`);
  }

  console.log(`✅ Bucket "${BUCKET}" creado`);
}

async function applyStoragePoliciesWithPg() {
  if (!databaseUrl) return false;

  let pg: typeof import('pg');
  try {
    pg = await import('pg');
  } catch {
    console.warn('⚠️  Instala pg para aplicar políticas automáticamente (opcional).');
    return false;
  }

  const sql = readFileSync(
    resolve(__dirname, '../../supabase/migrations/20250702120000_storage_realtime.sql'),
    'utf8',
  );
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Políticas de Storage aplicadas vía SUPABASE_DB_URL');
    return true;
  } finally {
    await client.end();
  }
}

async function applyPhotoUrlsMigrationWithPg() {
  if (!databaseUrl) return false;

  let pg: typeof import('pg');
  try {
    pg = await import('pg');
  } catch {
    return false;
  }

  const sql = readFileSync(
    resolve(__dirname, '../../supabase/migrations/20250705160000_capsule_photo_urls.sql'),
    'utf8',
  );
  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Columna photo_urls aplicada vía SUPABASE_DB_URL');
    return true;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🔍 Comprobando Storage de Capsules…\n');

  await ensureBucket();

  if (databaseUrl) {
    try {
      await applyStoragePoliciesWithPg();
      await applyPhotoUrlsMigrationWithPg();
    } catch (err) {
      console.warn('⚠️  SQL automático falló:', (err as Error).message);
      console.log('\n👉 Ejecuta en Supabase SQL Editor:');
      console.log('   - supabase/migrations/20250702120000_storage_realtime.sql');
      console.log('   - supabase/migrations/20250705160000_capsule_photo_urls.sql\n');
    }
  } else {
    console.log('\nℹ️  Añade SUPABASE_DB_URL en backend/.env para aplicar políticas y photo_urls.');
    console.log('   O ejecuta las migraciones SQL manualmente en Supabase.\n');
  }

  const { error: uploadTest } = await admin.storage.from(BUCKET).list('', { limit: 1 });
  if (uploadTest) {
    console.error('❌ El bucket no responde:', uploadTest.message);
    process.exit(1);
  }

  console.log('\n🎉 Storage listo para subir fotos.\n');
}

main().catch((err) => {
  console.error('❌ Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});

/**
 * Aplica migración de capsules en Supabase vía Postgres directo.
 * Requiere SUPABASE_DB_URL en backend/.env
 *
 * Uso: npm run apply:capsules-schema --prefix backend
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const migrations = [
  '20250705180000_capsules_full_schema.sql',
  '20250705190000_capsules_match_id_integer.sql',
];

const sql = migrations
  .map((file) =>
    readFileSync(resolve(__dirname, `../../supabase/migrations/${file}`), 'utf8'),
  )
  .join('\n\n');

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error(
      'Añade SUPABASE_DB_URL en backend/.env\n' +
        'Dashboard → Project Settings → Database → Connection string (URI)\n' +
        'O ejecuta las migraciones manualmente en el SQL Editor de Supabase.',
    );
  }

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

  console.log('🔧 Aplicando esquema de capsules…\n');

  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Migración aplicada');
    console.log('✅ PostgREST schema cache recargado\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});

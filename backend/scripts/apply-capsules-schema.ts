/**
 * Aplica migración de capsules en Supabase vía Postgres directo.
 * Requiere SUPABASE_DB_URL o SUPABASE_DB_PASSWORD en backend/.env
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

function buildConnectionString(): string {
  if (process.env.SUPABASE_DB_URL) {
    return process.env.SUPABASE_DB_URL;
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const url = process.env.SUPABASE_URL;
  if (!password || !url) {
    throw new Error(
      'Añade SUPABASE_DB_URL o SUPABASE_DB_PASSWORD en backend/.env\n' +
        'Dashboard → Project Settings → Database → Connection string (URI)',
    );
  }

  const ref = new URL(url).hostname.split('.')[0];
  const region = process.env.SUPABASE_DB_REGION ?? 'eu-central-1';
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}

async function main() {
  const connectionString = buildConnectionString();
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

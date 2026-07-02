#!/usr/bin/env node
/**
 * Crea un usuario de prueba en Supabase (email ya confirmado).
 * Uso: npm run seed:test-user
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '../backend');
const require = createRequire(path.join(backendDir, 'package.json'));

require('dotenv').config({ path: path.join(backendDir, '.env') });

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
};

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.TEST_USER_EMAIL ?? 'demo@ninety.app';
const password = process.env.TEST_USER_PASSWORD ?? 'DemoNinety123!';

if (!url || !secretKey) {
  console.error('❌ Faltan SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env');
  process.exit(1);
}

const supabase = createClient(url, secretKey, clientOptions);

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: 'Aficionado Demo' },
});

if (error) {
  if (error.message.includes('already been registered')) {
    console.log(`ℹ️  El usuario ${email} ya existe. Puedes iniciar sesión con esa cuenta.`);
    process.exit(0);
  }
  console.error('❌ Error:', error.message);
  process.exit(1);
}

console.log('✅ Usuario de prueba creado');
console.log(`   Email:    ${email}`);
console.log(`   Password: ${password === 'DemoNinety123!' ? 'DemoNinety123!' : '(TEST_USER_PASSWORD en .env)'}`);
console.log(`   ID:       ${data.user?.id}`);

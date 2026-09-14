/**
 * Crea o promueve un usuario admin interno (profiles.is_admin = true).
 *
 * Uso:
 *   ADMIN_EMAIL=tu@email.com npm run admin:promote
 *   ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD='...' npm run admin:promote   # crea si no existe
 *   npm run admin:promote -- --email tu@email.com
 *
 * Requiere SUPABASE_URL + SUPABASE_SECRET_KEY y la migración is_admin aplicada.
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

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (argValue('--email') ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD?.trim() || undefined;
const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Admin Ninety';

if (!url || !secretKey) {
  console.error('❌ Faltan SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env');
  process.exit(1);
}

if (!email || !email.includes('@')) {
  console.error('❌ Define ADMIN_EMAIL o --email con un correo válido');
  process.exit(1);
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

async function findUserIdByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === targetEmail);
    if (hit) return hit.id;
    if (data.users.length < perPage) return null;
    page += 1;
    if (page > 50) return null;
  }
}

let userId = await findUserIdByEmail(email);

if (!userId) {
  if (!password) {
    console.error(`❌ No existe ${email}. Pasa ADMIN_PASSWORD para crearlo, o regístralo antes.`);
    process.exit(1);
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, full_name: displayName },
  });
  if (error) {
    const detail =
      error.message || error.code || JSON.stringify(error, Object.getOwnPropertyNames(error));
    console.error('❌ No se pudo crear el usuario:', detail);
    console.error(
      '   Si el error es username NOT NULL, aplica supabase/migrations/20260914130000_fix_handle_new_user_username.sql',
    );
    process.exit(1);
  }
  userId = data.user?.id;
  console.log(`✅ Usuario creado: ${email}`);
} else {
  console.log(`ℹ️  Usuario existente: ${email}`);
}

if (!userId) {
  console.error('❌ Sin user id');
  process.exit(1);
}

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .update({ is_admin: true, full_name: displayName })
  .eq('id', userId)
  .select('id, username, full_name, is_admin')
  .maybeSingle();

if (profileError) {
  console.error('❌ No se pudo marcar is_admin:', profileError.message);
  console.error('   ¿Aplicaste supabase/migrations/20260914120000_profiles_is_admin.sql?');
  process.exit(1);
}

if (!profile) {
  console.error('❌ Perfil no encontrado tras el alta (trigger handle_new_user). Reintenta en unos segundos.');
  process.exit(1);
}

console.log('✅ Admin listo');
console.log(`   Email:    ${email}`);
console.log(`   Username: ${profile.username ?? '(sin username)'}`);
console.log(`   is_admin: ${profile.is_admin}`);
console.log('   Panel:    /admin (tras login)');

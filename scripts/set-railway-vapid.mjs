#!/usr/bin/env node
/**
 * Carga VAPID_* desde backend/.env y las publica en Railway
 * SIN imprimir los valores en la terminal.
 *
 * Uso:
 *   node scripts/set-railway-vapid.mjs
 *
 * Requisitos: railway CLI autenticado y linkado al servicio backend (API).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, 'backend/.env');

if (!existsSync(envPath)) {
  console.error('❌ No existe backend/.env');
  process.exit(1);
}

const envText = readFileSync(envPath, 'utf8');
const get = (key) => {
  const match = envText.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match?.[1]?.trim() ?? '';
};

const publicKey = get('VAPID_PUBLIC_KEY');
const privateKey = get('VAPID_PRIVATE_KEY');
const subject = get('VAPID_SUBJECT') || 'mailto:hello@ninety.app';

if (!publicKey || !privateKey) {
  console.error('❌ Faltan VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY en backend/.env');
  process.exit(1);
}

const railway = spawnSync('railway', ['--version'], { encoding: 'utf8' });
if (railway.status !== 0) {
  console.error('❌ Railway CLI no está instalado o no está en el PATH.');
  console.error('   Instálalo y luego: railway login && railway link');
  process.exit(1);
}

function setVar(name, value) {
  // No usar console.log del valor. Railway CLI recibe el valor por argv.
  const result = spawnSync('railway', ['variables', 'set', `${name}=${value}`], {
    encoding: 'utf8',
    cwd: root,
  });
  if (result.status !== 0) {
    console.error(`❌ Falló al setear ${name}`);
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(1);
  }
  console.log(`✅ ${name} configurada en Railway (valor oculto)`);
}

setVar('VAPID_PUBLIC_KEY', publicKey);
setVar('VAPID_PRIVATE_KEY', privateKey);
setVar('VAPID_SUBJECT', subject);

console.log('');
console.log('Listo. Reinicia el servicio API en Railway si no redeploya solo.');
console.log('Recuerda: estas claves NUNCA van al frontend ni a Git.');

#!/usr/bin/env node
/**
 * Evita commitear secretos reales en el repositorio.
 * Ejecutar antes de git commit: npm run check:secrets
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const FORBIDDEN_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]+/,
  /sb_publishable_[A-Za-z0-9_-]+/,
  /[a-f0-9]{32}/, // football-data.org keys (32 hex chars)
];

const ALLOWED_FILES = new Set([
  'scripts/check-secrets.mjs',
  'backend/.env.example',
  'frontend/.env.example',
  '.env.example',
]);

function getTrackedFiles() {
  try {
    const output = execSync('git ls-files', { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

let failed = false;

for (const file of getTrackedFiles()) {
  if (ALLOWED_FILES.has(file) || file.endsWith('.env.example')) continue;
  if (!existsSync(file)) continue;

  const content = readFileSync(file, 'utf8');

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content) && !content.includes('your-') && !content.includes('test')) {
      console.error(`❌ Posible secreto en ${file} (patrón: ${pattern})`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\nBloqueado: revisa que los secretos solo estén en archivos .env (gitignored).');
  process.exit(1);
}

console.log('✓ No se detectaron secretos en archivos trackeados.');

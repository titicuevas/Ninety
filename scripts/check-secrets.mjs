#!/usr/bin/env node
/**
 * Evita commitear secretos reales en el repositorio.
 * Ejecutar antes de git commit: npm run check:secrets
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.jsx']);
const SKIP_PREFIXES = ['.agents/', 'node_modules/'];

const FORBIDDEN_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]{10,}/,
  /DemoNinety123!/,
  /TEST_USER_PASSWORD\s*\?\?\s*['"][^'"]+['"]/,
];

function getTrackedFiles() {
  try {
    const output = execSync('git ls-files', { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function shouldScan(file) {
  if (file.endsWith('.env.example')) return false;
  if (SKIP_PREFIXES.some((p) => file.startsWith(p))) return false;
  const ext = file.slice(file.lastIndexOf('.'));
  return CODE_EXTENSIONS.has(ext);
}

let failed = false;

for (const file of getTrackedFiles()) {
  if (!shouldScan(file) || !existsSync(file)) continue;

  const content = readFileSync(file, 'utf8');
  if (content.includes('your-') || content.includes('_test')) continue;

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
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

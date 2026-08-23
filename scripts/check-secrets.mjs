#!/usr/bin/env node
/** Detecta credenciales reales sin imprimir nunca el valor encontrado. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;
const SKIP_FILES = new Set(['scripts/check-secrets.mjs']);
const SKIP_PREFIXES = ['.agents/', 'node_modules/'];
const PLACEHOLDER = /^(?:|.*\.{3}.*|test(?:[-_].*)?|example|placeholder|changeme|your[-_].*|tu[-_].*|.*_test|<.*>|\$.*|process\..*|z\..*)$/i;
const SECRET_PATTERNS = [
  { label: 'Supabase secret key', regex: /\bsb_secret_[A-Za-z0-9_-]{10,}\b/g },
  { label: 'JWT', regex: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g },
  { label: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { label: 'GitHub token', regex: /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { label: 'OpenAI key', regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { label: 'AWS access key', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
];
const SENSITIVE_ASSIGNMENT = /\b(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|FOOTBALL_DATA_API_KEY|TEST_USER_PASSWORD|DEMO_FANS_PASSWORD|VAPID_PRIVATE_KEY|CRON_SECRET)\b[ \t]*=(?!=)[ \t]*(?:['"]([^'"\r\n]*)['"]|([^\s,;}]+))/gi;

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function findingsIn(content) {
  const labels = new Set();
  for (const { label, regex } of SECRET_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(content)) labels.add(label);
  }
  for (const line of content.split('\n')) {
    SENSITIVE_ASSIGNMENT.lastIndex = 0;
    for (const match of line.matchAll(SENSITIVE_ASSIGNMENT)) {
      const value = (match[2] ?? match[3] ?? '').trim();
      if (!PLACEHOLDER.test(value)) labels.add(`valor real en ${match[1]}`);
    }
  }
  return [...labels];
}

let failed = false;
const files = git(['ls-files']).split('\n').filter(Boolean);
for (const file of files) {
  if (SKIP_FILES.has(file) || SKIP_PREFIXES.some((prefix) => file.startsWith(prefix)) || !existsSync(file)) continue;
  const content = readFileSync(file);
  if (content.length > MAX_TEXT_FILE_BYTES || content.includes(0)) continue;
  for (const label of findingsIn(content.toString('utf8'))) {
    console.error(`❌ Posible secreto (${label}) en ${file}`);
    failed = true;
  }
}

if (process.argv.includes('--history')) {
  const history = git(['log', '--all', '--format=@@COMMIT %H', '--no-ext-diff', '-p']);
  let commit = '';
  let file = '';
  const reported = new Set();
  for (const line of history.split('\n')) {
    if (line.startsWith('@@COMMIT ')) {
      commit = line.slice('@@COMMIT '.length, '@@COMMIT '.length + 12);
      continue;
    }
    if (line.startsWith('diff --git a/')) {
      file = line.split(' b/')[1] ?? '';
      continue;
    }
    if (SKIP_FILES.has(file)) continue;
    for (const label of findingsIn(line)) {
      const finding = `${label}|${commit}|${file}`;
      if (reported.has(finding)) continue;
      reported.add(finding);
      console.error(`❌ Posible secreto (${label}) en historial ${commit}:${file}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\nBloqueado: rota cualquier credencial real y elimínala del repositorio/historial.');
  process.exit(1);
}

console.log(process.argv.includes('--history')
  ? '✓ No se detectaron secretos en archivos trackeados ni en el historial Git.'
  : '✓ No se detectaron secretos en archivos trackeados.');

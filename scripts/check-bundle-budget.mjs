import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'frontend/dist');
const assetsDir = resolve(distDir, 'assets');
const initialBudget = 450 * 1024;
const chunkBudget = 150 * 1024;

const html = await readFile(resolve(distDir, 'index.html'), 'utf8');
const entryMatch = html.match(/<script[^>]+type="module"[^>]+src="([^"]+\.js)"/i);
if (!entryMatch) throw new Error('No se encontró el entry module en frontend/dist/index.html');

const entryName = basename(entryMatch[1]);
const jsFiles = (await readdir(assetsDir)).filter((file) => file.endsWith('.js'));
const sizes = await Promise.all(
  jsFiles.map(async (file) => ({ file, bytes: (await stat(resolve(assetsDir, file))).size })),
);
const entry = sizes.find(({ file }) => file === entryName);
if (!entry) throw new Error(`No se encontró ${entryName} en frontend/dist/assets`);

const failures = [];
const forbiddenBundleSecrets = [
  { label: 'Supabase secret key', regex: /\bsb_secret_[A-Za-z0-9_-]{10,}\b/ },
  { label: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'Supabase service role', regex: /\b(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\b/ },
];

for (const file of ['index.html', ...jsFiles.map((name) => `assets/${name}`)]) {
  const content = await readFile(resolve(distDir, file), 'utf8');
  for (const { label, regex } of forbiddenBundleSecrets) {
    if (regex.test(content)) failures.push(`${label} detectado en ${file}`);
  }
}

if (entry.bytes > initialBudget) {
  failures.push(`entry ${entry.file}: ${entry.bytes} B > ${initialBudget} B`);
}
const deferredChunks = sizes.filter(({ file }) => file !== entryName);
for (const chunk of deferredChunks) {
  if (chunk.bytes > chunkBudget) {
    failures.push(`chunk ${chunk.file}: ${chunk.bytes} B > ${chunkBudget} B`);
  }
}

console.log(`Bundle inicial: ${(entry.bytes / 1024).toFixed(1)} KiB / 450 KiB`);
console.log(
  `Chunk diferido mayor: ${(Math.max(...deferredChunks.map(({ bytes }) => bytes)) / 1024).toFixed(1)} KiB / 150 KiB`,
);

if (failures.length > 0) {
  throw new Error(`Presupuesto de bundle excedido:\n- ${failures.join('\n- ')}`);
}

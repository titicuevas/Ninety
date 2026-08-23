import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationsDir = resolve('supabase/migrations');
const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
const tables = new Set();
const rlsTables = new Set();
const policies = new Map();
const failures = [];

for (const file of files) {
  const sql = readFileSync(resolve(migrationsDir, file), 'utf8');
  const normalized = sql.replace(/--.*$/gm, ' ');

  for (const match of normalized.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z0-9_]*)/gi)) {
    tables.add(match[1].toLowerCase());
  }

  for (const match of normalized.matchAll(/alter\s+table\s+public\.([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/gi)) {
    rlsTables.add(match[1].toLowerCase());
  }

  for (const match of normalized.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?"([^"]+)"\s+on\s+((?:public|storage)\.[a-z_][a-z0-9_]*)/gi)) {
    policies.delete(`${match[2].toLowerCase()}:${match[1]}`);
  }

  for (const match of normalized.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+((?:public|storage)\.[a-z_][a-z0-9_]*)\s+([\s\S]*?);/gi)) {
    policies.set(`${match[2].toLowerCase()}:${match[1]}`, {
      file,
      name: match[1],
      table: match[2].toLowerCase(),
      definition: match[3],
    });
  }
}

for (const table of tables) {
  if (!rlsTables.has(table)) failures.push(`public.${table}: RLS no está activado`);
}

for (const policy of policies.values()) {
  const compact = policy.definition.replace(/\s+/g, ' ').trim();
  const label = `${policy.file}: política "${policy.name}" en ${policy.table}`;

  if (!/\bto\s+(?:anon|authenticated)\b/i.test(compact)) {
    failures.push(`${label}: falta un rol TO explícito`);
  }

  const withoutCachedUid = compact.replace(/\(\s*select\s+auth\.uid\(\)(?:::[a-z]+)?\s*\)/gi, 'cached_uid');
  if (/auth\.uid\(\)/i.test(withoutCachedUid)) {
    failures.push(`${label}: usa auth.uid() sin envolverlo en (select ...)`);
  }

  if (/\bfor\s+update\b/i.test(compact) && !/\bwith\s+check\s*\(/i.test(compact)) {
    failures.push(`${label}: UPDATE no define WITH CHECK`);
  }
}

if (failures.length > 0) {
  console.error(`Auditoría Supabase fallida (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Supabase SQL OK: ${tables.size} tablas públicas con RLS y ${policies.size} políticas activas auditadas.`);

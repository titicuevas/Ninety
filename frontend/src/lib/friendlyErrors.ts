/** Traduce errores técnicos de Supabase/API a mensajes claros en español. */
export function friendlyApiError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('schema cache') || lower.includes("could not find the")) {
    return 'La base de datos está desactualizada. Ejecuta la migración de capsules en Supabase (npm run verify:capsules --prefix backend).';
  }

  if (lower.includes('bucket not found')) {
    return 'El almacén de fotos no está configurado. Reinicia la API o ejecuta npm run verify:storage --prefix backend.';
  }

  if (lower.includes('invalid input syntax for type uuid')) {
    return 'La base de datos tiene un tipo incorrecto en match_id. Ejecuta la migración 20250705190000 en el SQL Editor de Supabase.';
  }

  if (lower.includes('capsule_likes') || lower.includes('20250711200000')) {
    return 'Los likes aún no están activados. Ejecuta la migración 20250711200000_capsule_likes.sql en Supabase.';
  }

  if (lower.includes('capsule_comments') || lower.includes('20250711210000')) {
    return 'Los comentarios aún no están activados. Ejecuta la migración 20250711210000_capsule_comments.sql en Supabase.';
  }

  if (lower.includes('duplicate key') || lower.includes('23505')) {
    return 'Ya guardaste este partido en tu diario.';
  }

  return message;
}

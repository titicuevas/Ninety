import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function requireSupabaseConfig() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan VITE_SUPABASE_URL o la clave pública de Supabase en el frontend.');
  }
}

export function createSupabaseBrowserClient(accessToken: string) {
  requireSupabaseConfig();
  return createClient(supabaseUrl!, supabaseKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

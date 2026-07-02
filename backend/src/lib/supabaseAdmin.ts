import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/loadEnv.js';

/**
 * Cliente admin (service role). Solo para operaciones de servidor que requieren bypass RLS.
 * Nunca exponer la secret key al frontend.
 */
export function createAdminClient(): SupabaseClient | null {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

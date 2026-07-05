import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/loadEnv.js';
import { createServiceClient } from './supabase.js';

/**
 * Cliente admin (service role). Solo para operaciones de servidor que requieren bypass RLS.
 */
export function createAdminClient(): SupabaseClient | null {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createServiceClient(env.SUPABASE_SERVICE_ROLE_KEY);
}

import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../config/loadEnv.js';

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
} as SupabaseClientOptions<'public'>;

export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, clientOptions);

export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, clientOptions)
  : null;

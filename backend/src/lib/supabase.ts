import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../config/loadEnv.js';

export const supabaseClientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
} as SupabaseClientOptions<'public'>;

export function createServiceClient(
  key: string,
  options?: SupabaseClientOptions<'public'>,
): SupabaseClient {
  return createClient(env.SUPABASE_URL, key, {
    ...supabaseClientOptions,
    ...options,
    auth: {
      ...supabaseClientOptions.auth,
      ...options?.auth,
    },
    realtime: {
      ...supabaseClientOptions.realtime,
      ...options?.realtime,
    },
  });
}

export const supabaseAnon = createServiceClient(env.SUPABASE_ANON_KEY);

export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...supabaseClientOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
  ? createServiceClient(env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

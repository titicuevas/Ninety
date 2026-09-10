import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '../config/loadEnv.js';
import { fetchWithTimeout } from './withTimeout.js';

/** Evita colgar Express si PostgREST/Auth no responden (proyecto pausado, pool saturado…). */
const SUPABASE_FETCH_TIMEOUT_MS = 20_000;

const testFetch: typeof fetch = async () =>
  new Response(JSON.stringify({ message: 'Supabase no disponible en test unitario' }), {
    // 400 evita los reintentos automáticos de PostgREST ante errores 5xx.
    status: 400,
    headers: { 'content-type': 'application/json' },
  });

const timedFetch: typeof fetch = (input, init) =>
  fetchWithTimeout(input, init, SUPABASE_FETCH_TIMEOUT_MS);

export const supabaseClientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
  global: {
    fetch: env.NODE_ENV === 'test' ? testFetch : timedFetch,
  },
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

import { supabase } from '@/lib/supabase';

const AUTH_CALLBACK_PATH = '/auth/callback';

function getAuthRedirectUrl(): string {
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
}

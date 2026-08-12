import { apiFetch } from '@/lib/api';

export async function deleteAccount(confirmEmail: string, accessToken: string): Promise<void> {
  await apiFetch<void>(
    '/api/auth/delete-account',
    {
      method: 'POST',
      body: JSON.stringify({ confirm_email: confirmEmail.trim() }),
    },
    accessToken,
  );
}

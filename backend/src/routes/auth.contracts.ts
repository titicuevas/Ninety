import { z } from 'zod';

export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(2).max(100),
  invite_code: z.string().trim().min(3).max(40).optional(),
});
export const oauthExchangeSchema = z.object({ code: z.string().min(1), pkceId: z.string().uuid() });
export const refreshSchema = z.object({ refresh_token: z.string().min(1) });
export const emailSchema = z.object({ email: z.string().email() });
export const passwordSchema = z.object({ password: z.string().min(6).max(72) });
export const deleteAccountSchema = z.object({ confirm_email: z.string().email() });
export const sessionFromTokensSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});
export const verifyEmailSchema = z.object({
  token_hash: z.string().min(1),
  type: z.enum(['signup', 'email', 'invite', 'magiclink', 'recovery', 'email_change']),
});

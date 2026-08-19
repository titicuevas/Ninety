import { z } from 'zod';

export const envSchema = z
  .object({
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CLIENT_URL: z.string().url(),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    SUPABASE_JWKS_URL: z.string().url().optional(),
    FOOTBALL_DATA_API_KEY: z.string().default(''),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default('mailto:hello@getninety.app'),
    /** Secreto para cron interno (digest push / diary / email). Header X-Cron-Secret o Bearer. Obligatorio en producción. */
    CRON_SECRET: z.string().min(8).optional(),
    /** API key Resend (digest email semanal). Opcional en local. */
    RESEND_API_KEY: z.string().min(1).optional(),
    /** Remitente digest email; default Ninety <noreply@getninety.app>. */
    EMAIL_DIGEST_FROM: z.string().min(3).optional(),
    /** Secreto HMAC para baja one-click del digest email (fallback: CRON_SECRET). */
    EMAIL_UNSUBSCRIBE_SECRET: z.string().min(8).optional(),
  })
  .refine((data) => data.SUPABASE_ANON_KEY || data.SUPABASE_PUBLISHABLE_KEY, {
    message: 'Se requiere SUPABASE_ANON_KEY o SUPABASE_PUBLISHABLE_KEY',
  })
  .refine((data) => data.NODE_ENV !== 'production' || (data.CRON_SECRET && data.CRON_SECRET.length >= 8), {
    message: 'CRON_SECRET es obligatorio en producción (mín. 8 caracteres)',
  });

export type ResolvedEnv = z.infer<typeof envSchema> & {
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export function resolveEnv(input: NodeJS.ProcessEnv): ResolvedEnv {
  const parsed = envSchema.parse(input);
  return {
    ...parsed,
    SUPABASE_ANON_KEY: parsed.SUPABASE_ANON_KEY ?? parsed.SUPABASE_PUBLISHABLE_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: parsed.SUPABASE_SERVICE_ROLE_KEY ?? parsed.SUPABASE_SECRET_KEY,
  };
}

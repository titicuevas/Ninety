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
    /** Secreto para cron interno (digest push). Header X-Cron-Secret o Bearer. */
    CRON_SECRET: z.string().min(8).optional(),
  })
  .refine((data) => data.SUPABASE_ANON_KEY || data.SUPABASE_PUBLISHABLE_KEY, {
    message: 'Se requiere SUPABASE_ANON_KEY o SUPABASE_PUBLISHABLE_KEY',
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

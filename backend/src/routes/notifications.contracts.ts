import { z } from 'zod';

const hhMmSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Usa HH:MM');

const pushQuietPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    start: hhMmSchema.optional(),
    end: hhMmSchema.optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Indica al menos un campo de horario silencioso',
  });

export const notificationPreferencesPatchSchema = z
  .object({
    like: z.boolean().optional(),
    comment: z.boolean().optional(),
    follow: z.boolean().optional(),
    push_anniversary: z.boolean().optional(),
    push_milestone: z.boolean().optional(),
    push_want_to_go: z.boolean().optional(),
    email_digest: z.boolean().optional(),
    push_quiet: pushQuietPatchSchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Indica al menos un campo',
  });

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

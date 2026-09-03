import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { listFollowActivity } from '../lib/followActivity.js';
import { createUserClient } from '../lib/supabase.js';
import { getBearerToken } from '../lib/httpRequest.js';

export const activityRouter = Router();

activityRouter.use(requireAuth);

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  type: z.enum(['capsule', 'collection', 'like', 'comment']).optional(),
});

/** GET /api/activity — timeline de Capsules, listas, me gusta y comentarios públicos de follows. */
activityRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Token requerido' });
      return;
    }

    const parsed = activityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { limit, offset, type } = parsed.data;
    const supabase = createUserClient(token);
    const result = await listFollowActivity(supabase, req.userId!, {
      limit,
      offset,
      type: type ?? null,
    });

    res.json({
      events: result.events,
      total: result.total,
      following_count: result.following_count,
      limit,
      offset,
      type: type ?? null,
    });
  } catch (err) {
    next(err);
  }
});

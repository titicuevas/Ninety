import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  mapNotificationCapsule,
  type CapsuleNotificationRow,
  type NotificationCapsule,
} from '../lib/notificationCapsule.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { getVapidPublicKey, isPushConfigured, sendPushToUser } from '../lib/webPush.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

const pushTestLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas pruebas de push. Espera un minuto.' },
});

const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

notificationsRouter.get('/push/public-key', (_req, res) => {
  if (!isPushConfigured()) {
    res.status(503).json({ error: 'Push no configurado', enabled: false });
    return;
  }
  res.json({ publicKey: getVapidPublicKey(), enabled: true });
});

notificationsRouter.post('/push/subscribe', async (req: AuthRequest, res, next) => {
  try {
    if (!isPushConfigured()) {
      res.status(503).json({ error: 'Push no configurado' });
      return;
    }

    const parsed = pushSubscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Suscripción inválida' });
      return;
    }

    const { endpoint, keys } = parsed.data;
    const { error } = await supabaseAdmin!.from('push_subscriptions').upsert(
      {
        user_id: req.userId!,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: req.headers['user-agent']?.slice(0, 300) ?? null,
      },
      { onConflict: 'user_id,endpoint' },
    );

    if (error) {
      if (error.code === '42P01') {
        res.status(503).json({ error: 'Ejecuta la migración push_subscriptions en Supabase.' });
        return;
      }
      throw error;
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.delete('/push/subscribe', async (req: AuthRequest, res, next) => {
  try {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : null;
    let query = supabaseAdmin!.from('push_subscriptions').delete().eq('user_id', req.userId!);
    if (endpoint) query = query.eq('endpoint', endpoint);

    const { error } = await query;
    if (error && error.code !== '42P01') throw error;

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/push/test', pushTestLimiter, async (req: AuthRequest, res, next) => {
  try {
    if (!isPushConfigured()) {
      res.status(503).json({ error: 'Push no configurado' });
      return;
    }

    const result = await sendPushToUser(req.userId!, {
      title: 'Ninety',
      body: 'Prueba de alertas: si ves esto, el push funciona.',
      url: '/notifications',
    });

    if (result.sent === 0) {
      res.status(400).json({
        error: 'No hay ninguna suscripción activa. Pulsa «Activar alertas» primero.',
        ...result,
      });
      return;
    }

    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const offset = Number(req.query.offset) || 0;

    type NotificationRow = {
      id: string;
      type: string;
      actor_id: string;
      capsule_id: string | null;
      body?: string | null;
      read: boolean;
      created_at: string;
    };

    let rows: NotificationRow[] = [];
    let listError: { message?: string; code?: string } | null = null;
    let total = 0;

    {
      const result = await supabaseAdmin!
        .from('notifications')
        .select('id, type, actor_id, capsule_id, body, read, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      listError = result.error;
      rows = (result.data as NotificationRow[] | null) ?? [];
      total = result.count ?? 0;
    }

    if (listError) {
      const missingBody =
        (listError.message ?? '').includes('body') &&
        ((listError.message ?? '').includes('schema cache') ||
          (listError.message ?? '').includes('Could not find') ||
          (listError.message ?? '').includes('column') ||
          (listError.message ?? '').includes('does not exist'));

      if (missingBody) {
        const fallback = await supabaseAdmin!
          .from('notifications')
          .select('id, type, actor_id, capsule_id, read, created_at', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        listError = fallback.error;
        rows = (fallback.data as NotificationRow[] | null) ?? [];
        total = fallback.count ?? 0;
      }
    }

    if (listError) {
      if (listError.code === '42P01') {
        res.json({ notifications: [], unread_count: 0, total: 0 });
        return;
      }
      throw listError;
    }

    const { count } = await supabaseAdmin!
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    const actorIds = [...new Set(rows.map((n) => n.actor_id))];
    const capsuleIds = [
      ...new Set(rows.map((n) => n.capsule_id).filter((id): id is string => Boolean(id))),
    ];
    const profiles: Record<
      string,
      { username: string | null; display_name: string | null; avatar_url: string | null }
    > = {};
    const capsules: Record<string, NotificationCapsule> = {};

    const [profilesResult, capsulesResult] = await Promise.all([
      actorIds.length > 0
        ? supabaseAdmin!
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', actorIds)
        : Promise.resolve({ data: null }),
      capsuleIds.length > 0
        ? supabaseAdmin!
            .from('capsules')
            .select('id, home_team_name, away_team_name, competition_name, photo_urls, photo_url')
            .in('id', capsuleIds)
        : Promise.resolve({ data: null }),
    ]);

    if (profilesResult.data) {
      for (const p of profilesResult.data) {
        profiles[p.id] = {
          username: p.username,
          display_name: p.full_name ?? null,
          avatar_url: p.avatar_url,
        };
      }
    }

    if (capsulesResult.data) {
      for (const row of capsulesResult.data as CapsuleNotificationRow[]) {
        const mapped = mapNotificationCapsule(row);
        if (mapped) capsules[mapped.id] = mapped;
      }
    }

    const notifications = rows.map((n) => ({
      ...n,
      body: typeof n.body === 'string' ? n.body : null,
      actor: profiles[n.actor_id] ?? null,
      capsule: n.capsule_id ? (capsules[n.capsule_id] ?? null) : null,
    }));

    res.json({ notifications, unread_count: count ?? 0, total });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/read', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { ids } = req.body as { ids?: string[] };

    const query = supabaseAdmin!
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    if (Array.isArray(ids) && ids.length > 0) {
      query.in('id', ids);
    }

    const { error } = await query;
    if (error && error.code !== '42P01') throw error;

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/read-all', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const { error } = await supabaseAdmin!
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error && error.code !== '42P01') throw error;

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.delete('/read', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const { data, error } = await supabaseAdmin!
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('read', true)
      .select('id');

    if (error) {
      if (error.code === '42P01') {
        res.json({ ok: true, deleted: 0 });
        return;
      }
      throw error;
    }

    res.json({ ok: true, deleted: data?.length ?? 0 });
  } catch (err) {
    next(err);
  }
});

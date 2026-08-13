import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  mapNotificationCapsule,
  type CapsuleNotificationRow,
  type NotificationCapsule,
} from '../lib/notificationCapsule.js';
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from '../lib/notificationPreferencesStore.js';
import {
  listMutedProfiles,
  muteUserById,
  resolveMuteTargetByUsername,
  unmuteUserById,
} from '../lib/notificationMutes.js';
import { parseNotificationTypeFilter, notificationDbTypesForFilter } from '../lib/notificationTypeFilter.js';

import { isValidIanaTimeZone } from '../lib/notificationQuietHours.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { getVapidPublicKey, isPushConfigured, sendPushToUser } from '../lib/webPush.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

const hhMmSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Usa HH:MM');

const pushQuietPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    start: hhMmSchema.optional(),
    end: hhMmSchema.optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
  })
  .refine(
    (q) =>
      q.enabled !== undefined ||
      q.start !== undefined ||
      q.end !== undefined ||
      q.timezone !== undefined,
    { message: 'Indica al menos un campo de horario silencioso' },
  );

const preferencesPatchSchema = z
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
  .refine(
    (body) =>
      body.like !== undefined ||
      body.comment !== undefined ||
      body.follow !== undefined ||
      body.push_anniversary !== undefined ||
      body.push_milestone !== undefined ||
      body.push_want_to_go !== undefined ||
      body.email_digest !== undefined ||
      body.push_quiet !== undefined,
    { message: 'Indica al menos un campo' },
  );

notificationsRouter.get('/preferences', async (req: AuthRequest, res, next) => {
  try {
    const prefs = await getNotificationPreferences(req.userId!);
    res.json(prefs);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.patch('/preferences', async (req: AuthRequest, res, next) => {
  try {
    const parsed = preferencesPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Preferencias inválidas' });
      return;
    }

    if (
      parsed.data.push_quiet?.timezone !== undefined &&
      !isValidIanaTimeZone(parsed.data.push_quiet.timezone)
    ) {
      res.status(400).json({ error: 'Zona horaria inválida' });
      return;
    }

    const prefs = await upsertNotificationPreferences(req.userId!, parsed.data);
    res.json(prefs);
  } catch (err) {
    const status = typeof (err as { status?: unknown })?.status === 'number'
      ? (err as { status: number }).status
      : undefined;
    if (status === 503) {
      res.status(503).json({
        error: err instanceof Error ? err.message : 'Preferencias no disponibles',
      });
      return;
    }
    next(err);
  }
});

function muteErrorStatus(err: unknown): number | undefined {
  return typeof (err as { status?: unknown })?.status === 'number'
    ? (err as { status: number }).status
    : undefined;
}

notificationsRouter.get('/muted', async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const offset = Number(req.query.offset) || 0;
    const result = await listMutedProfiles(req.userId!, { limit, offset });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/muted/:username', async (req: AuthRequest, res, next) => {
  try {
    const target = await resolveMuteTargetByUsername(String(req.params.username ?? ''));
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const result = await muteUserById(req.userId!, target.id);
    res.status(201).json(result);
  } catch (err) {
    const status = muteErrorStatus(err);
    if (status === 400 || status === 409 || status === 503) {
      res.status(status).json({
        error: err instanceof Error ? err.message : 'No se pudo silenciar',
      });
      return;
    }
    next(err);
  }
});

notificationsRouter.delete('/muted/:username', async (req: AuthRequest, res, next) => {
  try {
    const target = await resolveMuteTargetByUsername(String(req.params.username ?? ''));
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const result = await unmuteUserById(req.userId!, target.id);
    res.json(result);
  } catch (err) {
    const status = muteErrorStatus(err);
    if (status === 404 || status === 503) {
      res.status(status).json({
        error: err instanceof Error ? err.message : 'No se pudo reactivar',
      });
      return;
    }
    next(err);
  }
});

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
    const typeFilter = parseNotificationTypeFilter(req.query.type);

    type NotificationRow = {
      id: string;
      type: string;
      actor_id: string;
      capsule_id: string | null;
      collection_id?: string | null;
      body?: string | null;
      read: boolean;
      created_at: string;
    };

    let rows: NotificationRow[] = [];
    let listError: { message?: string; code?: string } | null = null;
    let total = 0;
    const selectWithCollection =
      'id, type, actor_id, capsule_id, collection_id, body, read, created_at';
    const selectLegacy = 'id, type, actor_id, capsule_id, body, read, created_at';

    {
      let query = supabaseAdmin!
        .from('notifications')
        .select(selectWithCollection, { count: 'exact' })
        .eq('user_id', userId);
      if (typeFilter) query = query.in('type', notificationDbTypesForFilter(typeFilter));
      const result = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      listError = result.error;
      rows = (result.data as NotificationRow[] | null) ?? [];
      total = result.count ?? 0;
    }

    if (listError) {
      const msg = listError.message ?? '';
      const missingBody =
        msg.includes('body') &&
        (msg.includes('schema cache') ||
          msg.includes('Could not find') ||
          msg.includes('column') ||
          msg.includes('does not exist'));
      const missingCollection = msg.includes('collection_id') || msg.includes('collection_like');

      if (missingBody || missingCollection) {
        const select = missingCollection
          ? missingBody
            ? 'id, type, actor_id, capsule_id, read, created_at'
            : selectLegacy
          : 'id, type, actor_id, capsule_id, collection_id, read, created_at';
        let fallbackQuery = supabaseAdmin!
          .from('notifications')
          .select(select, { count: 'exact' })
          .eq('user_id', userId);
        if (typeFilter) {
          fallbackQuery = missingCollection
            ? fallbackQuery.eq('type', typeFilter)
            : fallbackQuery.in('type', notificationDbTypesForFilter(typeFilter));
        }
        const fallback = await fallbackQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        listError = fallback.error;
        rows = (fallback.data as NotificationRow[] | null) ?? [];
        total = fallback.count ?? 0;
      }
    }

    if (listError) {
      if (listError.code === '42P01') {
        res.json({ notifications: [], unread_count: 0, total: 0, type: typeFilter });
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
    const collectionIds = [
      ...new Set(
        rows
          .map((n) => n.collection_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const profiles: Record<
      string,
      {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
        followed_by_me: boolean;
      }
    > = {};
    const capsules: Record<string, NotificationCapsule> = {};
    const collections: Record<string, { id: string; name: string }> = {};
    const followedSet = new Set<string>();

    const [profilesResult, capsulesResult, collectionsResult, followsResult] = await Promise.all([
      actorIds.length > 0
        ? supabaseAdmin!
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', actorIds)
        : Promise.resolve({ data: null }),
      capsuleIds.length > 0
        ? supabaseAdmin!
            .from('capsules')
            .select('id, home_team_name, away_team_name, competition_name, photo_urls')
            .in('id', capsuleIds)
        : Promise.resolve({ data: null }),
      collectionIds.length > 0
        ? supabaseAdmin!.from('collections').select('id, name').in('id', collectionIds)
        : Promise.resolve({ data: null }),
      actorIds.length > 0
        ? supabaseAdmin!
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', userId)
            .in('following_id', actorIds)
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (Array.isArray(followsResult.data)) {
      for (const row of followsResult.data as Array<{ following_id: string }>) {
        followedSet.add(row.following_id);
      }
    }

    if (profilesResult.data) {
      for (const p of profilesResult.data) {
        profiles[p.id] = {
          username: p.username,
          display_name: p.full_name ?? null,
          avatar_url: p.avatar_url,
          followed_by_me: followedSet.has(p.id),
        };
      }
    }

    if (capsulesResult.data) {
      for (const row of capsulesResult.data as CapsuleNotificationRow[]) {
        const mapped = mapNotificationCapsule(row);
        if (mapped) capsules[mapped.id] = mapped;
      }
    }

    if (collectionsResult.data) {
      for (const row of collectionsResult.data as Array<{ id: string; name: string }>) {
        collections[row.id] = { id: row.id, name: row.name };
      }
    }

    const notifications = rows.map((n) => ({
      ...n,
      collection_id: n.collection_id ?? null,
      body: typeof n.body === 'string' ? n.body : null,
      actor: profiles[n.actor_id] ?? null,
      capsule: n.capsule_id ? (capsules[n.capsule_id] ?? null) : null,
      collection: n.collection_id ? (collections[n.collection_id] ?? null) : null,
    }));

    res.json({
      notifications,
      unread_count: count ?? 0,
      total,
      type: typeFilter,
    });
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

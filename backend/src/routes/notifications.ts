import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const offset = Number(req.query.offset) || 0;

    const { data, error } = await supabaseAdmin!
      .from('notifications')
      .select('id, type, actor_id, capsule_id, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.code === '42P01') {
        res.json({ notifications: [], unread_count: 0 });
        return;
      }
      throw error;
    }

    const { count } = await supabaseAdmin!
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    const actorIds = [...new Set((data ?? []).map((n) => n.actor_id))];
    const profiles: Record<string, { username: string | null; display_name: string | null; avatar_url: string | null }> = {};

    if (actorIds.length > 0) {
      const { data: profileData } = await supabaseAdmin!
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', actorIds);

      if (profileData) {
        for (const p of profileData) {
          profiles[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url };
        }
      }
    }

    const notifications = (data ?? []).map((n) => ({
      ...n,
      actor: profiles[n.actor_id] ?? null,
    }));

    res.json({ notifications, unread_count: count ?? 0 });
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

import { Router } from 'express';
import { env } from '../config/loadEnv.js';
import { flushDiaryPushes } from '../lib/diaryPush.js';
import { flushEmailDigests } from '../lib/emailDigest.js';
import { flushPushDigests } from '../lib/pushDigest.js';
import { flushWantToGoPushes } from '../lib/wantToGoPush.js';

export const internalRouter = Router();

function readCronSecret(req: { headers: Record<string, unknown> }): string | null {
  const header = req.headers['x-cron-secret'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  return null;
}

function cronAuthorized(req: { headers: Record<string, unknown> }): boolean {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) return false;
  return readCronSecret(req) === secret;
}

/** Cron: digest push periódico (agrupa likes/comentarios/follows). */
internalRouter.post('/cron/push-digest', async (req, res, next) => {
  try {
    if (!cronAuthorized(req)) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const result = await flushPushDigests();
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

/** Cron: push opt-in de aniversarios / hitos / Quiero ir. */
internalRouter.post('/cron/push-diary', async (req, res, next) => {
  try {
    if (!cronAuthorized(req)) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const diary = await flushDiaryPushes();
    const wantToGo = await flushWantToGoPushes();
    res.json({ ok: true, diary, wantToGo });
  } catch (err) {
    next(err);
  }
});

/** Cron: digest email semanal del diario (opt-in; lunes en TZ usuario). */
internalRouter.post('/cron/email-digest', async (req, res, next) => {
  try {
    if (!cronAuthorized(req)) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const result = await flushEmailDigests();
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

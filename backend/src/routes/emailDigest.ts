import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/loadEnv.js';
import { disableEmailDigestForUser } from '../lib/emailDigest.js';
import { verifyEmailDigestUnsubscribe } from '../lib/emailDigestUnsubscribe.js';

export const emailDigestRouter = Router();

const unsubscribeLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Inténtalo más tarde.' },
});

function redirectSettings(res: { redirect: (code: number, url: string) => void }, status: 'off' | 'invalid') {
  const base = env.CLIENT_URL.replace(/\/$/, '');
  res.redirect(302, `${base}/settings?email_digest=${status}`);
}

/** Baja one-click (sin auth). Firma HMAC en query. */
emailDigestRouter.get('/unsubscribe', unsubscribeLimiter, async (req, res, next) => {
  try {
    const userId = typeof req.query.u === 'string' ? req.query.u.trim() : '';
    const sig = typeof req.query.sig === 'string' ? req.query.sig.trim() : '';

    if (!userId || !sig || !verifyEmailDigestUnsubscribe(userId, sig)) {
      redirectSettings(res, 'invalid');
      return;
    }

    await disableEmailDigestForUser(userId);
    redirectSettings(res, 'off');
  } catch (err) {
    next(err);
  }
});

/** POST one-click List-Unsubscribe (algunos clientes). */
emailDigestRouter.post('/unsubscribe', unsubscribeLimiter, async (req, res, next) => {
  try {
    const userId =
      (typeof req.query.u === 'string' ? req.query.u.trim() : '') ||
      (typeof req.body?.u === 'string' ? req.body.u.trim() : '');
    const sig =
      (typeof req.query.sig === 'string' ? req.query.sig.trim() : '') ||
      (typeof req.body?.sig === 'string' ? req.body.sig.trim() : '');

    if (!userId || !sig || !verifyEmailDigestUnsubscribe(userId, sig)) {
      res.status(400).json({ error: 'Enlace inválido' });
      return;
    }

    await disableEmailDigestForUser(userId);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { claimInviteAttribution, fetchInvitePreview, normalizeInviteCode } from '../lib/invites.js';

export const invitesRouter = Router();

const claimLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
});

const previewLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Inténtalo en un minuto.' },
});

const claimSchema = z.object({
  code: z.string().trim().min(3).max(40),
});

function inviteErrorStatus(err: unknown): number | undefined {
  return typeof (err as { status?: unknown })?.status === 'number'
    ? (err as { status: number }).status
    : undefined;
}

/** Atribuye la invitación al usuario autenticado (cuentas nuevas). */
invitesRouter.post('/claim', requireAuth, claimLimiter, async (req: AuthRequest, res, next) => {
  try {
    const parsed = claimSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Código de invitación inválido' });
      return;
    }

    const attribution = await claimInviteAttribution({
      inviteeId: req.userId!,
      code: parsed.data.code,
    });

    res.status(201).json({ attribution });
  } catch (err) {
    const status = inviteErrorStatus(err);
    if (status === 400 || status === 404 || status === 409 || status === 503) {
      res.status(status).json({
        error: err instanceof Error ? err.message : 'No se pudo atribuir la invitación',
      });
      return;
    }
    next(err);
  }
});

/** Preview público del invitador (sin PII sensible). */
invitesRouter.get('/:code', previewLimiter, async (req, res, next) => {
  try {
    const code = normalizeInviteCode(req.params.code);
    if (!code) {
      res.status(404).json({ error: 'Invitación no encontrada' });
      return;
    }

    const preview = await fetchInvitePreview(code);
    if (!preview) {
      res.status(404).json({ error: 'Invitación no encontrada' });
      return;
    }

    res.json({ invite: preview });
  } catch (err) {
    next(err);
  }
});

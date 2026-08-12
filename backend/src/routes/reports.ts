import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  CONTENT_REPORT_REASONS,
  CONTENT_REPORT_TARGET_TYPES,
  createContentReport,
  hasReportedTarget,
  isContentReportTargetType,
  isUuid,
  listMyContentReports,
} from '../lib/contentReports.js';
import { resolveBlockTargetByUsername } from '../lib/userBlocks.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

const reportLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados reportes. Espera unos minutos e inténtalo de nuevo.' },
});

const createReportSchema = z
  .object({
    target_type: z.enum(CONTENT_REPORT_TARGET_TYPES),
    target_id: z.string().uuid().optional(),
    /** Atajo para reportar usuario por username (alternativa a target_id). */
    username: z.string().trim().min(1).max(40).optional(),
    reason: z.enum(CONTENT_REPORT_REASONS),
    note: z.string().max(500).optional().nullable(),
  })
  .refine((body) => !!body.target_id || !!body.username, {
    message: 'Indica target_id o username',
  })
  .refine((body) => body.target_type !== 'capsule' || !!body.target_id, {
    message: 'Capsule requiere target_id',
  });

function reportErrorStatus(err: unknown): number | undefined {
  return typeof (err as { status?: unknown })?.status === 'number'
    ? (err as { status: number }).status
    : undefined;
}

reportsRouter.post('/', reportLimiter, async (req: AuthRequest, res, next) => {
  try {
    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos de reporte inválidos' });
      return;
    }

    const { target_type, reason, note, username } = parsed.data;
    let targetId = parsed.data.target_id;

    if (target_type === 'user' && !targetId && username) {
      const target = await resolveBlockTargetByUsername(username);
      if (!target) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }
      targetId = target.id;
    }

    if (!targetId || !isUuid(targetId)) {
      res.status(400).json({ error: 'Objetivo inválido' });
      return;
    }

    const report = await createContentReport({
      reporterId: req.userId!,
      targetType: target_type,
      targetId,
      reason,
      note,
    });

    res.status(201).json({ report });
  } catch (err) {
    const status = reportErrorStatus(err);
    if (status === 400 || status === 404 || status === 409 || status === 503) {
      res.status(status).json({
        error: err instanceof Error ? err.message : 'No se pudo enviar el reporte',
      });
      return;
    }
    next(err);
  }
});

reportsRouter.get('/me', async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const offset = Number(req.query.offset) || 0;
    const result = await listMyContentReports(req.userId!, { limit, offset });
    res.json(result);
  } catch (err) {
    const status = reportErrorStatus(err);
    if (status === 503) {
      res.status(503).json({
        error: err instanceof Error ? err.message : 'Reportes no disponibles',
      });
      return;
    }
    next(err);
  }
});

/** Comprueba si ya reporté este objetivo (UI: deshabilitar botón). */
reportsRouter.get('/status', async (req: AuthRequest, res, next) => {
  try {
    const targetType = req.query.target_type;
    const targetId = req.query.target_id;
    if (!isContentReportTargetType(targetType) || !isUuid(targetId)) {
      res.status(400).json({ error: 'Parámetros inválidos' });
      return;
    }
    const reported = await hasReportedTarget(req.userId!, targetType, targetId);
    res.json({ reported });
  } catch (err) {
    next(err);
  }
});

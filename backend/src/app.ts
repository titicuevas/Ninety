import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/loadEnv.js';
import { createApiRateLimiter } from './lib/apiRateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';
import { capsulesRouter } from './routes/capsules.js';
import { collectionsRouter } from './routes/collections.js';
import { footballRouter } from './routes/football.js';
import { healthRouter } from './routes/health.js';
import { indexRouter } from './routes/index.js';
import { profileRouter } from './routes/profile.js';
import { authRouter } from './routes/auth.js';
import { notificationsRouter } from './routes/notifications.js';
import { reportsRouter } from './routes/reports.js';
import { invitesRouter } from './routes/invites.js';
import { wantToGoRouter } from './routes/wantToGo.js';
import { internalRouter } from './routes/internal.js';
import { emailDigestRouter } from './routes/emailDigest.js';
import { activityRouter } from './routes/activity.js';
import { requestId } from './middleware/requestId.js';
import { requestMetrics } from './middleware/requestMetrics.js';

const footballLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Inténtalo en un minuto.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  // Local/E2E: suites largas re-hidratan sesión; producción sigue estricta
  max: env.NODE_ENV === 'production' ? 40 : 2_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
});

export function createApp() {
  const app = express();

  app.use(requestId);
  app.use(requestMetrics);

  // Railway (y cualquier reverse proxy) manda X-Forwarded-For; sin esto el límite
  // ve una sola IP y un flood colapsa el bucket de todo el mundo.
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Peticiones sin Origin (curl, health checks)
        if (!origin) {
          callback(null, true);
          return;
        }

        const fromEnv = (process.env.CORS_ORIGINS ?? '')
          .split(',')
          .map((value) => value.trim().replace(/\/$/, ''))
          .filter(Boolean);

        const allowed = new Set([
          env.CLIENT_URL.replace(/\/$/, ''),
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          // Producción legacy + dominio custom (transición)
          'https://ninety.up.railway.app',
          'https://getninety.app',
          'https://www.getninety.app',
          ...fromEnv,
        ]);

        if (allowed.has(origin)) {
          callback(null, true);
          return;
        }

        // Dev: cualquier localhost / 127.0.0.1
        if (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/', indexRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/internal', internalRouter);
  app.use('/api', createApiRateLimiter());
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/capsules', capsulesRouter);
  app.use('/api/collections', collectionsRouter);
  app.use('/api/football', footballLimiter, footballRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/invites', invitesRouter);
  app.use('/api/want-to-go', wantToGoRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/email-digest', emailDigestRouter);

  app.use(errorHandler);

  return app;
}

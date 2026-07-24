import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/loadEnv.js';
import { errorHandler } from './middleware/errorHandler.js';
import { capsulesRouter } from './routes/capsules.js';
import { footballRouter } from './routes/football.js';
import { healthRouter } from './routes/health.js';
import { indexRouter } from './routes/index.js';
import { profileRouter } from './routes/profile.js';
import { authRouter } from './routes/auth.js';

const footballLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Inténtalo en un minuto.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' },
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Peticiones sin Origin (curl, health checks)
        if (!origin) {
          callback(null, true);
          return;
        }

        const allowed = new Set([
          env.CLIENT_URL,
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'https://ninety.up.railway.app',
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
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/capsules', capsulesRouter);
  app.use('/api/football', footballLimiter, footballRouter);

  app.use(errorHandler);

  return app;
}

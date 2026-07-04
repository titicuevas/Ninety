import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/loadEnv.js';
import { errorHandler } from './middleware/errorHandler.js';
import { footballRouter } from './routes/football.js';
import { healthRouter } from './routes/health.js';
import { profileRouter } from './routes/profile.js';
import { authRouter } from './routes/auth.js';

const footballLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Inténtalo en un minuto.' },
});

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/football', footballLimiter, footballRouter);

  app.use(errorHandler);

  return app;
}

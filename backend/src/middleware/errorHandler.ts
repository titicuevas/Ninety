import type { NextFunction, Request, Response } from 'express';
import { FootballApiError } from '../lib/footballApi.js';
import { env } from '../config/loadEnv.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err instanceof FootballApiError) {
    res.status(err.status).json({
      error: err.message,
      retryAfterSeconds: err.retryAfterSeconds,
    });
    return;
  }

  const isProduction = env.NODE_ENV === 'production';

  if (err instanceof Error) {
    const message = err.message.includes('WebSocket')
      ? 'Error de conexión con el servidor. Reinicia el backend e inténtalo de nuevo.'
      : err.message;

    res.status(500).json({
      error: isProduction ? 'Error interno del servidor' : message,
    });
    return;
  }

  res.status(500).json({ error: 'Error interno del servidor' });
}

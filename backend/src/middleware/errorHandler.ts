import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/loadEnv.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  const isProduction = env.NODE_ENV === 'production';

  if (err instanceof Error) {
    res.status(500).json({
      error: isProduction ? 'Error interno del servidor' : err.message,
    });
    return;
  }

  res.status(500).json({ error: 'Error interno del servidor' });
}

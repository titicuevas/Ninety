import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { FootballApiError } from '../lib/footballApi.js';
import { env } from '../config/loadEnv.js';
import { safeErrorLog } from '../lib/safeErrorLog.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  console.error('[request-error]', {
    requestId: res.locals.requestId,
    method: req.method,
    path: req.path,
    ...safeErrorLog(err),
  });

  if (err instanceof FootballApiError) {
    res.status(err.status).json({
      error: err.message,
      retryAfterSeconds: err.retryAfterSeconds,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'La foto no puede superar 5 MB.' });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({ error: 'Demasiadas fotos en una sola subida (máximo 9).' });
      return;
    }
    res.status(400).json({ error: 'No se pudo subir la foto. Prueba de nuevo.' });
    return;
  }

  if (err instanceof Error) {
    const photoClientError =
      err.message.includes('Solo JPG') ||
      err.message.includes('JPG, PNG') ||
      err.message.includes('foto') ||
      err.message.includes('WebP');

    if (photoClientError) {
      res.status(400).json({ error: err.message });
      return;
    }

    const isProduction = env.NODE_ENV === 'production';
    const message = isProduction
      ? 'Error interno del servidor'
      : err.message.includes('WebSocket')
        ? 'Error de conexión con el servidor. Reinicia el backend e inténtalo de nuevo.'
        : err.message;

    res.status(500).json({
      error: isProduction ? 'Error interno del servidor' : message,
    });
    return;
  }

  res.status(500).json({ error: 'Error interno del servidor' });
}

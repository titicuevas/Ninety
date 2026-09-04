import type { NextFunction, Request, Response } from 'express';
import { performance } from 'node:perf_hooks';

export function requestMetrics(req: Request, res: Response, next: NextFunction) {
  const startedAt = performance.now();

  res.once('finish', () => {
    const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
    console.log(
      JSON.stringify({
        event: 'http_request',
        request_id: res.locals.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: durationMs,
      }),
    );
  });

  next();
}
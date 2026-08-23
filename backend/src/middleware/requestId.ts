import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function resolveRequestId(value: unknown): string {
  return typeof value === 'string' && SAFE_REQUEST_ID.test(value) ? value : randomUUID();
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = resolveRequestId(req.get('x-request-id'));
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

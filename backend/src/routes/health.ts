import { Router } from 'express';
import { runtimeHealth } from '../lib/runtimeHealth.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const health = runtimeHealth();
  res.json({
    status: 'ok',
    service: 'ninety-api',
    version: '0.1.0',
    uptime_seconds: health.uptimeSeconds,
  });
});

healthRouter.get('/ready', (_req, res) => {
  const health = runtimeHealth();
  res.status(health.ready ? 200 : 503).json({
    status: health.ready ? 'ready' : 'starting',
    service: 'ninety-api',
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';

describe('errorHandler', () => {
  it('no filtra mensajes de infraestructura en producción', async () => {
    const previous = process.env.NODE_ENV;
    process.env.CLIENT_URL = 'http://localhost:5173';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.NODE_ENV = 'production';
    const { errorHandler } = await import('./errorHandler.js');
    let response: Record<string, unknown> | undefined;
    const res = {
      locals: {},
      status: () => ({ json: (body: Record<string, unknown>) => { response = body; } }),
    } as unknown as Response;

    errorHandler(new Error('SUPABASE_SERVICE_ROLE_KEY=leak'), {} as Request, res, () => undefined);

    assert.deepEqual(response, { error: 'Error interno del servidor' });
    process.env.NODE_ENV = previous;
  });
});
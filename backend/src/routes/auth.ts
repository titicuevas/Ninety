import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/loadEnv.js';
import { createPkceStorage, removePkceStorage } from '../lib/pkceStorage.js';
import { syncUserProfile } from '../lib/syncUserProfile.js';
import { createServiceClient, createUserClient, supabaseAnon } from '../lib/supabase.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(2).max(100),
});

const oauthExchangeSchema = z.object({
  code: z.string().min(1),
  pkceId: z.string().uuid(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

function createPkceClient(sessionId: string) {
  return createServiceClient(env.SUPABASE_ANON_KEY, {
    auth: {
      storage: createPkceStorage(sessionId),
      flowType: 'pkce',
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function serializeSession(session: NonNullable<Awaited<ReturnType<typeof supabaseAnon.auth.signInWithPassword>>['data']['session']>) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? undefined,
    user: {
      id: session.user.id,
      email: session.user.email,
      user_metadata: session.user.user_metadata,
    },
  };
}

async function finalizeAuthSession(
  session: NonNullable<Awaited<ReturnType<typeof supabaseAnon.auth.signInWithPassword>>['data']['session']>,
) {
  await syncUserProfile({
    id: session.user.id,
    email: session.user.email,
    user_metadata: session.user.user_metadata as Record<string, unknown>,
  });
  return serializeSession(session);
}

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword(parsed.data);

  if (error || !data.session) {
    res.status(401).json({ error: error?.message ?? 'Credenciales inválidas' });
    return;
  }

  res.json({ session: await finalizeAuthSession(data.session) });
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabaseAnon.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.display_name, full_name: parsed.data.display_name } },
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (!data.session) {
    res.json({ session: null, message: 'Revisa tu email para confirmar la cuenta' });
    return;
  }

  await syncUserProfile({
    id: data.session.user.id,
    email: data.session.user.email,
    user_metadata: {
      ...(data.session.user.user_metadata as Record<string, unknown>),
      display_name: parsed.data.display_name,
      full_name: parsed.data.display_name,
    },
  });

  res.json({ session: serializeSession(data.session) });
});

authRouter.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    await createUserClient(token).auth.signOut().catch(() => undefined);
  }
  res.status(204).end();
});

authRouter.get('/session', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Sin sesión' });
    return;
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Sesión inválida' });
    return;
  }

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    },
  });
});

authRouter.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabaseAnon.auth.refreshSession({
    refresh_token: parsed.data.refresh_token,
  });

  if (error || !data.session) {
    res.status(401).json({ error: error?.message ?? 'No se pudo renovar la sesión' });
    return;
  }

  res.json({ session: await finalizeAuthSession(data.session) });
});

authRouter.post('/oauth/google', async (_req, res) => {
  const pkceId = randomUUID();
  const client = createPkceClient(pkceId);

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.CLIENT_URL}/auth/callback`,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error || !data.url) {
    removePkceStorage(pkceId);
    res.status(400).json({ error: error?.message ?? 'No se pudo iniciar OAuth' });
    return;
  }

  const probe = await fetch(data.url, { method: 'GET', redirect: 'manual' });
  const contentType = probe.headers.get('content-type') ?? '';

  if (!probe.ok && contentType.includes('application/json')) {
    const body = (await probe.json().catch(() => null)) as { msg?: string; error_code?: string } | null;
    removePkceStorage(pkceId);

    if (body?.msg?.toLowerCase().includes('not enabled') || body?.error_code === 'validation_failed') {
      res.status(503).json({
        error:
          'Google no está activado en Supabase. Ve a Authentication → Providers → Google y configura Client ID y Secret.',
      });
      return;
    }

    res.status(400).json({ error: body?.msg ?? 'No se pudo iniciar sesión con Google' });
    return;
  }

  res.json({ url: data.url, pkceId });
});

authRouter.post('/oauth/exchange', async (req, res) => {
  const parsed = oauthExchangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const client = createPkceClient(parsed.data.pkceId);
  const { data, error } = await client.auth.exchangeCodeForSession(parsed.data.code);
  removePkceStorage(parsed.data.pkceId);

  if (error || !data.session) {
    res.status(401).json({ error: error?.message ?? 'No se pudo completar OAuth' });
    return;
  }

  res.json({ session: await finalizeAuthSession(data.session) });
});

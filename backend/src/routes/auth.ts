import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { env } from '../config/loadEnv.js';
import { getBearerToken } from '../lib/httpRequest.js';
import { deleteUserAccount, isAccountDeleteEmailConfirmed } from '../lib/deleteAccount.js';
import { createPkceStorage, removePkceStorage } from '../lib/pkceStorage.js';
import { syncUserProfile } from '../lib/syncUserProfile.js';
import { claimInviteAttribution, normalizeInviteCode } from '../lib/invites.js';
import { createServiceClient, createUserClient, supabaseAnon } from '../lib/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  deleteAccountSchema,
  emailSchema,
  loginSchema,
  oauthExchangeSchema,
  passwordSchema,
  refreshSchema,
  registerSchema,
  sessionFromTokensSchema,
  verifyEmailSchema,
} from './auth.contracts.js';

export const authRouter = Router();

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
    options: {
      emailRedirectTo: `${env.CLIENT_URL}/auth/callback`,
      data: { display_name: parsed.data.display_name, full_name: parsed.data.display_name },
    },
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (!data.session) {
    res.json({
      session: null,
      message:
        'Cuenta creada. Revisa tu email y confirma el enlace para activar la cuenta. Después podrás iniciar sesión.',
    });
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

  const inviteCode = normalizeInviteCode(parsed.data.invite_code);
  if (inviteCode) {
    try {
      await claimInviteAttribution({
        inviteeId: data.session.user.id,
        code: inviteCode,
        inviteeCreatedAt: data.session.user.created_at,
      });
    } catch {
      // Atribución best-effort: no bloquea el registro.
    }
  }

  res.json({ session: serializeSession(data.session) });
});

authRouter.post('/logout', async (req, res) => {
  const token = getBearerToken(req);
  if (token) {
    await createUserClient(token).auth.signOut().catch(() => undefined);
  }
  res.status(204).end();
});

authRouter.get('/session', async (req, res) => {
  const token = getBearerToken(req);
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

/** Sesión tras confirmación de email (tokens en hash/query del redirect). */
authRouter.post('/session/from-tokens', async (req, res) => {
  const parsed = sessionFromTokensSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabaseAnon.auth.setSession({
    access_token: parsed.data.access_token,
    refresh_token: parsed.data.refresh_token,
  });

  if (error || !data.session) {
    res.status(401).json({ error: error?.message ?? 'Enlace de confirmación inválido o caducado' });
    return;
  }

  res.json({ session: await finalizeAuthSession(data.session) });
});

/** Confirmación vía token_hash (plantilla custom o PKCE email). */
authRouter.post('/verify-email', async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabaseAnon.auth.verifyOtp({
    token_hash: parsed.data.token_hash,
    type: parsed.data.type,
  });

  if (error || !data.session) {
    res.status(401).json({ error: error?.message ?? 'No se pudo confirmar el email' });
    return;
  }

  res.json({ session: await finalizeAuthSession(data.session) });
});

/** Solicitud de recuperación — siempre 200 para no filtrar emails. */
authRouter.post('/forgot-password', async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { error } = await supabaseAnon.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.CLIENT_URL}/auth/reset-password`,
  });

  if (error) {
    console.error('[auth/forgot-password]', error.message);
  }

  res.json({
    message: 'Si existe una cuenta con ese email, te enviamos un enlace para restablecer la contraseña.',
  });
});

/** Cambio de contraseña con sesión activa (Ajustes). */
authRouter.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { error } = await createUserClient(token).auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ message: 'Contraseña actualizada' });
});

/**
 * Restablecer tras el email de recovery.
 * Acepta Bearer del token de recovery (hash) o sesión ya establecida.
 */
authRouter.post('/reset-password', async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Enlace de recuperación inválido o caducado' });
    return;
  }

  const { error } = await createUserClient(token).auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
});

/** Borrado self-serve de cuenta (GDPR). Requiere confirmar el email de la sesión. */
authRouter.post('/delete-account', requireAuth, async (req: AuthRequest, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Email de confirmación inválido' });
    return;
  }

  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Sesión inválida' });
    return;
  }

  if (!isAccountDeleteEmailConfirmed(userData.user.email, parsed.data.confirm_email)) {
    res.status(400).json({ error: 'El email no coincide con tu cuenta' });
    return;
  }

  const result = await deleteUserAccount(req.userId!);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(204).end();
});

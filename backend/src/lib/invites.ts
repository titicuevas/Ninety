import { getBlockRelation, isBlockActive } from './userBlocks.js';
import { normalizeUsernameParam } from './usernameParam.js';

const AUTO_USERNAME = /^user_[a-f0-9]{8}$/i;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Cuentas más antiguas no pueden reclamar un invite (anti-gaming). */
export const INVITE_CLAIM_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isAutoUsername(username: string | null | undefined) {
  return !username || AUTO_USERNAME.test(username);
}

export type InvitePreview = {
  code: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type InviteAttributionRow = {
  invitee_id: string;
  inviter_id: string;
  invite_code: string;
  created_at: string;
};

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isMissingInvitesTable(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  if (!err) return false;
  if (err.code === '42P01') return true;
  const message = (err.message ?? '').toLowerCase();
  return (
    message.includes('invite_attributions') ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

/** Normaliza y valida un código de invitación (username). */
export function normalizeInviteCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = normalizeUsernameParam(value);
  if (!code || code.length < 3 || code.length > 30) return null;
  if (!/^[a-z0-9_]+$/.test(code)) return null;
  if (isAutoUsername(code)) return null;
  return code;
}

export function isInviteClaimTooOld(createdAt: string | null | undefined, now = Date.now()): boolean {
  if (!createdAt) return true;
  const ts = Date.parse(createdAt);
  if (Number.isNaN(ts)) return true;
  return now - ts > INVITE_CLAIM_MAX_AGE_MS;
}

export async function fetchInvitePreview(codeRaw: string): Promise<InvitePreview | null> {
  const code = normalizeInviteCode(codeRaw);
  if (!code) return null;

  const { supabaseAdmin, supabaseAnon } = await import('./supabase.js');
  const client = supabaseAdmin ?? supabaseAnon;
  if (!client) return null;

  const { data, error } = await client
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('username', code)
    .maybeSingle();

  if (error || !data?.username || isAutoUsername(data.username)) return null;

  return {
    code: data.username,
    username: data.username,
    display_name: (data.full_name as string | null) ?? null,
    avatar_url: (data.avatar_url as string | null) ?? null,
  };
}

type ClaimInviteInput = {
  inviteeId: string;
  code: string;
  /** ISO created_at del perfil/usuario invitee (para ventana anti-gaming). */
  inviteeCreatedAt?: string | null;
};

/**
 * Atribuye un registro vía invite. Idempotente si ya hay la misma atribución.
 * Respeta bloqueos bidireccionales.
 */
export async function claimInviteAttribution(
  input: ClaimInviteInput,
): Promise<InviteAttributionRow> {
  const code = normalizeInviteCode(input.code);
  if (!code) {
    throw Object.assign(new Error('Código de invitación inválido'), { status: 400 });
  }
  if (!isUuid(input.inviteeId)) {
    throw Object.assign(new Error('Usuario inválido'), { status: 400 });
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Invitaciones no disponibles'), { status: 503 });
  }

  const { data: inviter, error: inviterError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, created_at')
    .eq('username', code)
    .maybeSingle();

  if (inviterError) {
    if (isMissingInvitesTable(inviterError)) {
      throw Object.assign(new Error('Invitaciones no disponibles'), { status: 503 });
    }
    throw Object.assign(new Error('No se pudo resolver la invitación'), { status: 500 });
  }

  if (!inviter?.id || !inviter.username || isAutoUsername(inviter.username)) {
    throw Object.assign(new Error('Invitación no encontrada'), { status: 404 });
  }

  if (inviter.id === input.inviteeId) {
    throw Object.assign(new Error('No puedes usar tu propio enlace'), { status: 400 });
  }

  let inviteeCreatedAt = input.inviteeCreatedAt ?? null;
  if (!inviteeCreatedAt) {
    const { data: inviteeProfile } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .eq('id', input.inviteeId)
      .maybeSingle();
    inviteeCreatedAt = (inviteeProfile?.created_at as string | null) ?? null;
  }

  if (isInviteClaimTooOld(inviteeCreatedAt)) {
    throw Object.assign(new Error('Solo cuentas nuevas pueden usar una invitación'), {
      status: 400,
    });
  }

  const block = await getBlockRelation(input.inviteeId, inviter.id);
  if (isBlockActive(block)) {
    throw Object.assign(new Error('No se puede atribuir esta invitación'), { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from('invite_attributions')
    .select('invitee_id, inviter_id, invite_code, created_at')
    .eq('invitee_id', input.inviteeId)
    .maybeSingle();

  if (existing) {
    if (existing.inviter_id === inviter.id) {
      return existing as InviteAttributionRow;
    }
    throw Object.assign(new Error('Ya tienes una invitación atribuida'), { status: 409 });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('invite_attributions')
    .insert({
      invitee_id: input.inviteeId,
      inviter_id: inviter.id,
      invite_code: inviter.username,
    })
    .select('invitee_id, inviter_id, invite_code, created_at')
    .single();

  if (insertError) {
    if (isMissingInvitesTable(insertError)) {
      throw Object.assign(new Error('Invitaciones no disponibles'), { status: 503 });
    }
    // Carrera: unique invitee_id
    if (insertError.code === '23505') {
      const { data: raced } = await supabaseAdmin
        .from('invite_attributions')
        .select('invitee_id, inviter_id, invite_code, created_at')
        .eq('invitee_id', input.inviteeId)
        .maybeSingle();
      if (raced?.inviter_id === inviter.id) return raced as InviteAttributionRow;
      throw Object.assign(new Error('Ya tienes una invitación atribuida'), { status: 409 });
    }
    throw Object.assign(new Error('No se pudo guardar la invitación'), { status: 500 });
  }

  return inserted as InviteAttributionRow;
}

import { getBlockRelation, isBlockActive } from './userBlocks.js';

export const CONTENT_REPORT_TARGET_TYPES = ['user', 'capsule'] as const;
export type ContentReportTargetType = (typeof CONTENT_REPORT_TARGET_TYPES)[number];

export const CONTENT_REPORT_REASONS = [
  'spam',
  'harassment',
  'hate',
  'inappropriate',
  'impersonation',
  'other',
] as const;
export type ContentReportReason = (typeof CONTENT_REPORT_REASONS)[number];

export type ContentReportRow = {
  id: string;
  reporter_id: string;
  target_type: ContentReportTargetType;
  target_id: string;
  reason: ContentReportReason;
  note: string | null;
  created_at: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isContentReportTargetType(value: unknown): value is ContentReportTargetType {
  return (
    typeof value === 'string' &&
    (CONTENT_REPORT_TARGET_TYPES as readonly string[]).includes(value)
  );
}

export function isContentReportReason(value: unknown): value is ContentReportReason {
  return (
    typeof value === 'string' && (CONTENT_REPORT_REASONS as readonly string[]).includes(value)
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function normalizeReportNote(note: unknown): string | null {
  if (note == null) return null;
  if (typeof note !== 'string') return null;
  const trimmed = note.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 500);
}

export function isMissingReportsTable(error: unknown): boolean {
  const err = error as { code?: string; message?: string } | null;
  if (!err) return false;
  if (err.code === '42P01') return true;
  const message = (err.message ?? '').toLowerCase();
  return (
    message.includes('content_reports') ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

export type CreateContentReportInput = {
  reporterId: string;
  targetType: ContentReportTargetType;
  targetId: string;
  reason: ContentReportReason;
  note?: string | null;
};

/**
 * Crea un reporte. Valida existencia del objetivo y respeta bloqueos en Capsules
 * (no se puede reportar contenido que el bloqueo ya oculta).
 */
export async function createContentReport(
  input: CreateContentReportInput,
): Promise<ContentReportRow> {
  const { reporterId, targetType, targetId, reason } = input;
  const note = normalizeReportNote(input.note);

  if (!isUuid(targetId)) {
    throw Object.assign(new Error('Objetivo inválido'), { status: 400 });
  }
  if (!isContentReportReason(reason)) {
    throw Object.assign(new Error('Motivo inválido'), { status: 400 });
  }

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Reportes no disponibles'), { status: 503 });
  }

  if (targetType === 'user') {
    if (reporterId === targetId) {
      throw Object.assign(new Error('No puedes reportarte a ti mismo'), { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', targetId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile?.id) {
      throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
    }
  } else {
    const { data: capsule, error: capsuleError } = await supabaseAdmin
      .from('capsules')
      .select('id, user_id, is_public')
      .eq('id', targetId)
      .maybeSingle();

    if (capsuleError) throw capsuleError;
    if (!capsule?.id) {
      throw Object.assign(new Error('Capsule no encontrada'), { status: 404 });
    }
    if (capsule.user_id === reporterId) {
      throw Object.assign(new Error('No puedes reportar tu propia Capsule'), { status: 400 });
    }
    if (capsule.is_public === false) {
      throw Object.assign(new Error('Capsule no encontrada'), { status: 404 });
    }

    const block = await getBlockRelation(reporterId, capsule.user_id as string);
    if (isBlockActive(block)) {
      throw Object.assign(new Error('Capsule no encontrada'), { status: 404 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('content_reports')
    .insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason,
      note,
    })
    .select('id, reporter_id, target_type, target_id, reason, note, created_at')
    .single();

  if (error) {
    if (isMissingReportsTable(error)) {
      throw Object.assign(new Error('Ejecuta la migración content_reports en Supabase.'), {
        status: 503,
      });
    }
    if (error.code === '23505') {
      throw Object.assign(new Error('Ya has reportado este contenido'), { status: 409 });
    }
    throw error;
  }

  return data as ContentReportRow;
}

export async function listMyContentReports(
  reporterId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ reports: ContentReportRow[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) {
    throw Object.assign(new Error('Reportes no disponibles'), { status: 503 });
  }

  const { data, error, count } = await supabaseAdmin
    .from('content_reports')
    .select('id, reporter_id, target_type, target_id, reason, note, created_at', {
      count: 'exact',
    })
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    if (isMissingReportsTable(error)) {
      throw Object.assign(new Error('Ejecuta la migración content_reports en Supabase.'), {
        status: 503,
      });
    }
    throw error;
  }

  return {
    reports: (data ?? []) as ContentReportRow[],
    total: count ?? (data?.length ?? 0),
  };
}

/** true si el reporter ya denunció este objetivo (para UI). */
export async function hasReportedTarget(
  reporterId: string,
  targetType: ContentReportTargetType,
  targetId: string,
): Promise<boolean> {
  if (!isUuid(targetId)) return false;

  const { supabaseAdmin } = await import('./supabase.js');
  if (!supabaseAdmin) return false;

  const { data, error } = await supabaseAdmin
    .from('content_reports')
    .select('id')
    .eq('reporter_id', reporterId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  if (error) {
    if (isMissingReportsTable(error)) return false;
    return false;
  }
  return !!data?.id;
}

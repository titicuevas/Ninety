import { env } from '../config/loadEnv.js';
import { runtimeHealth } from './runtimeHealth.js';
import { isMissingProfileColumn } from './profileLookup.js';
import { supabaseAdmin } from './supabase.js';

export type AdminMetrics = {
  generated_at: string;
  users: {
    total: number;
    registered_last_7d: number;
    registered_last_30d: number;
    with_at_least_one_capsule: number;
    active_writers_last_7d: number;
    activation_rate_30d: number | null;
  };
  capsules: {
    total: number;
    created_last_7d: number;
  };
  recent_signups: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    created_at: string;
    has_capsule: boolean;
  }>;
  system: {
    api_ready: boolean;
    uptime_seconds: number;
    football_api_configured: boolean;
  };
};

function startOfDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function asCount(error: { message?: string } | null, count: number | null): number {
  if (error) throw new Error(error.message ?? 'Error de métricas');
  return count ?? 0;
}

/**
 * Agregados de producto vía service role (no expone filas privadas al cliente).
 */
export async function loadAdminMetrics(): Promise<AdminMetrics> {
  if (!supabaseAdmin) {
    throw new Error('Admin no disponible (falta service role)');
  }

  const since7d = startOfDaysAgo(7);
  const since30d = startOfDaysAgo(30);
  const health = runtimeHealth();

  const [
    totalUsers,
    users7d,
    users30d,
    totalCapsules,
    capsules7d,
    recentProfiles,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since7d),
    supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since30d),
    supabaseAdmin.from('capsules').select('id', { count: 'exact', head: true }),
    supabaseAdmin
      .from('capsules')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since7d),
    supabaseAdmin
      .from('profiles')
      .select('id, username, full_name, created_at')
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  if (totalUsers.error && isMissingProfileColumn(totalUsers.error, 'is_admin')) {
    // count no usa is_admin; si falla por schema, propagar mensaje claro
  }

  for (const res of [totalUsers, users7d, users30d, recentProfiles]) {
    if (res.error && isMissingProfileColumn(res.error)) {
      throw new Error(
        'Esquema de perfiles desactualizado. Ejecuta supabase/migrations/20260914120000_profiles_is_admin.sql',
      );
    }
  }

  const profileIds = (recentProfiles.data ?? []).map((p) => p.id as string);
  const capsuleOwners = new Set<string>();

  if (profileIds.length > 0) {
    const { data: ownerRows, error: ownersError } = await supabaseAdmin
      .from('capsules')
      .select('user_id')
      .in('user_id', profileIds);
    if (ownersError) throw new Error(ownersError.message);
    for (const row of ownerRows ?? []) {
      if (row.user_id) capsuleOwners.add(row.user_id as string);
    }
  }

  // Distinct writers (activo = escribió Capsule en 7d) y usuarios con ≥1 Capsule.
  // PostgREST no tiene count distinct trivial; paginamos ids recientes.
  const { data: recentWriterRows, error: writersError } = await supabaseAdmin
    .from('capsules')
    .select('user_id')
    .gte('created_at', since7d)
    .limit(5000);
  if (writersError) throw new Error(writersError.message);
  const activeWriters = new Set(
    (recentWriterRows ?? []).map((r) => r.user_id as string).filter(Boolean),
  );

  const { data: anyCapsuleRows, error: anyCapsuleError } = await supabaseAdmin
    .from('capsules')
    .select('user_id')
    .limit(10000);
  if (anyCapsuleError) throw new Error(anyCapsuleError.message);
  const usersWithCapsule = new Set(
    (anyCapsuleRows ?? []).map((r) => r.user_id as string).filter(Boolean),
  );

  // Activación 30d: registros recientes que ya tienen al menos una Capsule.
  const { data: cohort30, error: cohortError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .gte('created_at', since30d)
    .limit(5000);
  if (cohortError) throw new Error(cohortError.message);
  const cohortIds = (cohort30 ?? []).map((p) => p.id as string);
  let activated30 = 0;
  if (cohortIds.length > 0) {
    const { data: activatedRows, error: activatedError } = await supabaseAdmin
      .from('capsules')
      .select('user_id')
      .in('user_id', cohortIds)
      .limit(10000);
    if (activatedError) throw new Error(activatedError.message);
    activated30 = new Set(
      (activatedRows ?? []).map((r) => r.user_id as string).filter(Boolean),
    ).size;
  }

  const registered30 = asCount(users30d.error, users30d.count);
  const activationRate =
    registered30 > 0 ? Math.round((activated30 / registered30) * 1000) / 1000 : null;

  return {
    generated_at: new Date().toISOString(),
    users: {
      total: asCount(totalUsers.error, totalUsers.count),
      registered_last_7d: asCount(users7d.error, users7d.count),
      registered_last_30d: registered30,
      with_at_least_one_capsule: usersWithCapsule.size,
      active_writers_last_7d: activeWriters.size,
      activation_rate_30d: activationRate,
    },
    capsules: {
      total: asCount(totalCapsules.error, totalCapsules.count),
      created_last_7d: asCount(capsules7d.error, capsules7d.count),
    },
    recent_signups: (recentProfiles.data ?? []).map((p) => ({
      id: p.id as string,
      username: (p.username as string | null) ?? null,
      display_name: (p.full_name as string | null) ?? null,
      created_at: p.created_at as string,
      has_capsule: capsuleOwners.has(p.id as string),
    })),
    system: {
      api_ready: health.ready,
      uptime_seconds: health.uptimeSeconds,
      football_api_configured: Boolean(env.FOOTBALL_DATA_API_KEY?.trim()),
    },
  };
}

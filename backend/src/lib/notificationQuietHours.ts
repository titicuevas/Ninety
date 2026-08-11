/** Franja local sin push (in-app sí). HH:MM 24h + IANA timezone del dispositivo. */

export type PushQuietHours = {
  enabled: boolean;
  /** Inicio inclusive, HH:MM (0–23). */
  start: string;
  /** Fin exclusivo, HH:MM (0–23). */
  end: string;
  /** IANA, p. ej. Europe/Madrid. */
  timezone: string;
};

export const DEFAULT_PUSH_QUIET_HOURS: PushQuietHours = {
  enabled: false,
  start: '22:00',
  end: '08:00',
  timezone: 'UTC',
};

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseHhMm(value: string): number | null {
  const match = HH_MM.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatHhMm(totalMinutes: number): string {
  const mins = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  const tz = timeZone.trim();
  if (!tz || tz.length > 64) return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** Minutos desde medianoche en la zona indicada. Fallback UTC si la zona es inválida. */
export function localMinutesOfDay(date: Date, timeZone: string): number {
  const tz = isValidIanaTimeZone(timeZone) ? timeZone.trim() : 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);

  let hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  if (hour === 24) hour = 0;
  return hour * 60 + minute;
}

/**
 * true si `now` cae en la franja silenciosa.
 * Ventana que cruza medianoche (22:00→08:00) y diurna (13:00→14:00).
 * start === end → no silencia.
 */
export function isWithinPushQuietHours(
  quiet: PushQuietHours | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!quiet?.enabled) return false;

  const start = parseHhMm(quiet.start);
  const end = parseHhMm(quiet.end);
  if (start == null || end == null || start === end) return false;

  const minutes = localMinutesOfDay(now, quiet.timezone || 'UTC');
  if (start < end) {
    return minutes >= start && minutes < end;
  }
  return minutes >= start || minutes < end;
}

export function normalizePushQuietHours(
  raw: Partial<PushQuietHours> | null | undefined,
): PushQuietHours {
  const start =
    typeof raw?.start === 'string' && parseHhMm(raw.start) != null
      ? raw.start.trim()
      : DEFAULT_PUSH_QUIET_HOURS.start;
  const end =
    typeof raw?.end === 'string' && parseHhMm(raw.end) != null
      ? raw.end.trim()
      : DEFAULT_PUSH_QUIET_HOURS.end;
  const timezone =
    typeof raw?.timezone === 'string' && isValidIanaTimeZone(raw.timezone)
      ? raw.timezone.trim()
      : DEFAULT_PUSH_QUIET_HOURS.timezone;

  return {
    enabled: raw?.enabled === true,
    start,
    end,
    timezone,
  };
}

type QuietRow = {
  push_quiet_enabled?: boolean | null;
  push_quiet_start?: string | null;
  push_quiet_end?: string | null;
  push_quiet_timezone?: string | null;
};

/** time de Postgres llega como "22:00:00" o "22:00". */
function timeToHhMm(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(trimmed);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23) return null;
  return formatHhMm(h * 60 + m);
}

export function mapPushQuietHoursRow(row: QuietRow | null | undefined): PushQuietHours {
  if (!row) return { ...DEFAULT_PUSH_QUIET_HOURS };
  return normalizePushQuietHours({
    enabled: row.push_quiet_enabled === true,
    start: timeToHhMm(row.push_quiet_start) ?? undefined,
    end: timeToHhMm(row.push_quiet_end) ?? undefined,
    timezone: row.push_quiet_timezone ?? undefined,
  });
}

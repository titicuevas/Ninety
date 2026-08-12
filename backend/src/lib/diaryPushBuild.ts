import type { DiaryAnniversary } from './diaryAnniversary.js';
import type { DiaryMilestone } from './diaryMilestone.js';
import { isValidIanaTimeZone } from './notificationQuietHours.js';

export type DiaryPushKind = 'anniversary' | 'milestone';

export type DiaryPushPayload = {
  title: string;
  body: string;
  url: string;
};

/** Día local YYYY-MM-DD en zona IANA (fallback UTC). */
export function localDayKeyInTimeZone(date: Date, timeZone: string): string {
  const tz = isValidIanaTimeZone(timeZone) ? timeZone.trim() : 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function localYmdInTimeZone(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const key = localDayKeyInTimeZone(date, timeZone);
  const [y, m, d] = key.split('-').map(Number);
  return { year: y!, month: m!, day: d! };
}

export function anniversaryEventKey(dayKey: string): string {
  return dayKey;
}

export function milestoneEventKey(threshold: number): string {
  return String(threshold);
}

export function buildAnniversaryPushPayload(anniversary: DiaryAnniversary): DiaryPushPayload {
  return {
    title: anniversary.title,
    body: anniversary.body.slice(0, 180),
    url: anniversary.href,
  };
}

export function buildMilestonePushPayload(milestone: DiaryMilestone): DiaryPushPayload {
  return {
    title: milestone.title,
    body: milestone.body.slice(0, 180),
    url: milestone.href,
  };
}

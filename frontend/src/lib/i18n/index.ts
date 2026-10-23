import { en } from '@/lib/i18n/messages.en';
import { es } from '@/lib/i18n/messages.es';
import type { Locale, Messages } from '@/lib/i18n/types';

export type { Locale, Messages };

export const locales: Locale[] = ['es', 'en'];

export const messagesByLocale: Record<Locale, Messages> = {
  es,
  en,
};

export function getMessages(locale: Locale): Messages {
  return messagesByLocale[locale] ?? es;
}

export function formatMessage(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

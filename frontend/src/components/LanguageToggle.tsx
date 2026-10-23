import { useI18n } from '@/lib/i18n/LocaleProvider';
import type { Locale } from '@/lib/i18n/types';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** compact = solo ES|EN; default incluye etiqueta en sm+ */
  size?: 'sm' | 'md';
};

export function LanguageToggle({ className, size = 'md' }: Props) {
  const { locale, setLocale, t } = useI18n();

  const set = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
  };

  return (
    <div
      role="group"
      aria-label={t.language}
      className={cn(
        'inline-flex items-center rounded-lg border border-white/10 bg-zinc-950/60 p-0.5 text-xs font-semibold tracking-wide',
        className,
      )}
    >
      {size === 'md' ? (
        <span className="hidden px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:inline">
          {t.language}
        </span>
      ) : null}
      <button
        type="button"
        aria-pressed={locale === 'es'}
        aria-label={t.switchToEs}
        onClick={() => set('es')}
        className={cn(
          'min-h-9 min-w-9 rounded-md px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          locale === 'es'
            ? 'bg-primary/20 text-primary'
            : 'text-zinc-400 hover:text-foreground',
        )}
      >
        {t.languageEs}
      </button>
      <button
        type="button"
        aria-pressed={locale === 'en'}
        aria-label={t.switchToEn}
        onClick={() => set('en')}
        className={cn(
          'min-h-9 min-w-9 rounded-md px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          locale === 'en'
            ? 'bg-primary/20 text-primary'
            : 'text-zinc-400 hover:text-foreground',
        )}
      >
        {t.languageEn}
      </button>
    </div>
  );
}

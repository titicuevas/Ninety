import { useI18n } from '@/lib/i18n/LocaleProvider';

export function SkipLink() {
  const { t } = useI18n();

  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={() => {
        const main = document.getElementById('main-content');
        if (!main) return;
        // SPA: el hash solo no siempre mueve el foco; garantizar destino focusable.
        if (!main.hasAttribute('tabindex')) {
          main.setAttribute('tabindex', '-1');
        }
        main.focus({ preventScroll: false });
      }}
    >
      {t.skipToContent}
    </a>
  );
}

import { useEffect } from 'react';

/**
 * Analítica agregada sin cookies (Plausible), solo si VITE_PLAUSIBLE_DOMAIN está definido.
 * No carga nada en local/preview sin env.
 */
export function AnalyticsBeacon() {
  useEffect(() => {
    const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN?.trim();
    if (!domain || typeof document === 'undefined') return;
    if (document.querySelector('script[data-ninety-analytics="plausible"]')) return;

    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = domain;
    script.dataset.ninetyAnalytics = 'plausible';
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }, []);

  return null;
}

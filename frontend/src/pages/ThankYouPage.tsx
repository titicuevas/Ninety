import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { buttonVariants } from '@/components/ui/button-variants';
import { useI18n } from '@/lib/i18n/LocaleProvider';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { cn } from '@/lib/utils';

type ThankYouState = { email?: string };

export function ThankYouPage() {
  const { t } = useI18n();
  const { state } = useLocation();
  const email = (state as ThankYouState | null)?.email;
  usePageMetadata({
    title: t.thankYouTitle,
    description: t.thankYouMetaDescription,
    robots: 'noindex, follow',
  });

  return (
    <AuthLayout title={t.thankYouTitle} subtitle={t.thankYouSubtitle}>
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden />
        <h2 className="mt-5 text-xl font-semibold text-foreground">{t.thankYouCheckInbox}</h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          {email ? (
            <>
              {t.thankYouSentTo} <strong className="text-foreground">{email}</strong>. {t.thankYouOpenLink}
            </>
          ) : (
            <>
              {t.thankYouSentEmail} {t.thankYouOpenLink}
            </>
          )}
        </p>
      </div>
      <ul className="mt-6 space-y-2 rounded-xl border border-border bg-card p-4 text-sm text-zinc-300">
        <li className="flex gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          {t.thankYouSpam}
        </li>
        <li>{t.thankYouSender}</li>
        <li>{t.thankYouRetry}</li>
      </ul>
      <Link to="/login" className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-full')}>
        {t.thankYouCta}
      </Link>
      <p className="mt-5 text-center text-sm text-zinc-300">{t.thankYouSupportSla}</p>
    </AuthLayout>
  );
}

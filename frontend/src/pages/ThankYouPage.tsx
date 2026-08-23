import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/AuthLayout';
import { buttonVariants } from '@/components/ui/button-variants';
import { usePageMetadata } from '@/hooks/usePageMetadata';
import { cn } from '@/lib/utils';

type ThankYouState = { email?: string };

export function ThankYouPage() {
  const { state } = useLocation();
  const email = (state as ThankYouState | null)?.email;
  usePageMetadata({
    title: 'Gracias por registrarte',
    description: 'Confirma tu correo para empezar tu diario futbolero en Ninety.',
    robots: 'noindex, follow',
  });

  return (
    <AuthLayout title="Gracias por registrarte" subtitle="Tu diario futbolero está a un paso">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden />
        <h2 className="mt-5 text-xl font-semibold">Revisa tu bandeja de entrada</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Hemos enviado un enlace de confirmación{email ? <> a <strong className="text-foreground">{email}</strong></> : ' a tu email'}.
          Ábrelo para activar la cuenta.
        </p>
      </div>
      <ul className="mt-6 space-y-2 rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />Revisa también spam y promociones.</li>
        <li>El remitente es noreply@getninety.app.</li>
        <li>Si no llega en unos minutos, vuelve a registrarte o escribe a hello@getninety.app.</li>
      </ul>
      <Link to="/login" className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-full')}>Ir a iniciar sesión</Link>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        Objetivo de respuesta de soporte: antes de 2 días laborables.
      </p>
    </AuthLayout>
  );
}

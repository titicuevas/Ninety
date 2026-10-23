import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '@/components/AuthLayout';
import { FormAlert } from '@/components/FormAlert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { requestPasswordReset } from '@/lib/auth';
import { createForgotPasswordSchema } from '@/lib/authSchemas';
import { useI18n } from '@/lib/i18n/LocaleProvider';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Form = z.infer<ReturnType<typeof createForgotPasswordSchema>>;

export function ForgotPasswordPage() {
  const { t } = useI18n();
  useDocumentTitle(t.forgotDocTitle);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => createForgotPasswordSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(data.email);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.forgotErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t.forgotTitle} subtitle={t.forgotSubtitle}>
      {done ? (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>{t.forgotDone}</p>
          <p className="text-center">
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t.forgotBack}
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => void onSubmit(d))} className="space-y-4">
          <FormField label={t.authEmail} error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              placeholder={t.authEmailPlaceholder}
              {...register('email')}
            />
          </FormField>
          {error ? <FormAlert>{error}</FormAlert> : null}
          <Button type="submit" loading={loading} className="w-full">
            {t.forgotSubmit}
          </Button>
        </form>
      )}

      {!done ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t.forgotBack}
          </Link>
        </p>
      ) : null}
    </AuthLayout>
  );
}

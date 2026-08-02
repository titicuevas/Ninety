import { useState } from 'react';
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
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const schema = z.object({
  email: z.string().email('Email inválido'),
});

type Form = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  useDocumentTitle('Recuperar contraseña');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

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
      setError(err instanceof Error ? err.message : 'No se pudo enviar el email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviamos un enlace si la cuenta existe"
    >
      {done ? (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la
            contraseña. Revisa también spam.
          </p>
          <p className="text-center">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Volver al login
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => void onSubmit(d))} className="space-y-4">
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="tu@email.com" {...register('email')} />
          </FormField>
          {error ? <FormAlert>{error}</FormAlert> : null}
          <Button type="submit" loading={loading} className="w-full">
            Enviar enlace
          </Button>
        </form>
      )}

      {!done ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Volver al login
          </Link>
        </p>
      ) : null}
    </AuthLayout>
  );
}

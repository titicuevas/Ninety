import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '@/components/AuthLayout';
import { FormAlert } from '@/components/FormAlert';
import { PasswordField } from '@/components/PasswordField';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { resetPasswordWithToken } from '@/lib/auth';
import { passwordConfirmSchema, type PasswordConfirmForm } from '@/lib/authSchemas';
import { clearRecoveryUrl, parseRecoveryParams } from '@/lib/recoveryToken';
import { clearSession } from '@/lib/session';
import { useAuthStore } from '@/stores/authStore';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [token, setToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const parsed = parseRecoveryParams(window.location.search, window.location.hash);
    clearRecoveryUrl();
    if (!parsed.ok) {
      setLinkError(parsed.error);
      return;
    }
    setToken(parsed.accessToken);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordConfirmForm>({ resolver: zodResolver(passwordConfirmSchema) });

  const onSubmit = async (data: PasswordConfirmForm) => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      await resetPasswordWithToken(token, data.password);
      clearSession();
      setSession(null);
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Elige una contraseña segura para tu cuenta">
      {linkError ? (
        <div className="space-y-4">
          <FormAlert>{linkError}</FormAlert>
          <p className="text-center text-sm">
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              Solicitar nuevo enlace
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => void onSubmit(d))} className="space-y-4">
          <FormField label="Nueva contraseña" error={errors.password?.message}>
            <PasswordField
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('password')}
            />
          </FormField>
          <FormField label="Confirmar" error={errors.confirm?.message}>
            <PasswordField
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('confirm')}
            />
          </FormField>
          {error ? <FormAlert>{error}</FormAlert> : null}
          <Button type="submit" loading={loading} className="w-full" disabled={!token}>
            Guardar contraseña
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

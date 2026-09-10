import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '@/components/AuthLayout';
import { FormAlert } from '@/components/FormAlert';
import { NinetyLoader } from '@/components/NinetyLoader';
import { PasswordField } from '@/components/PasswordField';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { exchangeRecoveryTokenHash, resetPasswordWithToken } from '@/lib/auth';
import { passwordConfirmSchema, type PasswordConfirmForm } from '@/lib/authSchemas';
import { clearRecoveryUrl, parseRecoveryParams } from '@/lib/recoveryToken';
import { clearSession } from '@/lib/session';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuthStore } from '@/stores/authStore';

export function ResetPasswordPage() {
  useDocumentTitle('Nueva contraseña');
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [recovery] = useState(() => parseRecoveryParams(window.location.search, window.location.hash));
  const [token, setToken] = useState<string | null>(() =>
    recovery.ok && recovery.kind === 'access_token' ? recovery.accessToken : null,
  );
  const [linkError, setLinkError] = useState<string | null>(() =>
    recovery.ok ? null : recovery.error,
  );
  const [resolving, setResolving] = useState(
    () => recovery.ok && recovery.kind === 'token_hash',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    clearRecoveryUrl();
  }, []);

  useEffect(() => {
    if (!recovery.ok || recovery.kind !== 'token_hash') return;
    let active = true;

    void (async () => {
      try {
        const accessToken = await exchangeRecoveryTokenHash(recovery.tokenHash);
        if (!active) return;
        setToken(accessToken);
        setResolving(false);
      } catch (err) {
        if (!active) return;
        setLinkError(
          err instanceof Error
            ? err.message
            : 'Enlace inválido o caducado. Solicita uno nuevo.',
        );
        setResolving(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [recovery]);

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

  if (resolving) {
    return (
      <AuthLayout title="Nueva contraseña" subtitle="Validando el enlace…">
        <div className="flex justify-center py-8" role="status" aria-live="polite">
          <NinetyLoader label="Validando enlace de recuperación" />
        </div>
      </AuthLayout>
    );
  }

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

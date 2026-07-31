import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '@/components/AuthLayout';
import { FormAlert } from '@/components/FormAlert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { resetPasswordWithToken } from '@/lib/auth';
import { clearSession } from '@/lib/session';
import { useAuthStore } from '@/stores/authStore';

const schema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string().min(6, 'Mínimo 6 caracteres'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

type Form = z.infer<typeof schema>;

function parseRecoveryFromHash(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const type = params.get('type');
  const access_token = params.get('access_token');
  if (!access_token) return null;
  if (type && type !== 'recovery') return null;
  return access_token;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [token, setToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const accessToken = parseRecoveryFromHash();
    if (!accessToken) {
      setLinkError(
        'Enlace inválido o caducado. Solicita uno nuevo desde “¿Olvidaste tu contraseña?”.',
      );
      return;
    }
    setToken(accessToken);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
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
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register('password')}
            />
          </FormField>
          <FormField label="Confirmar" error={errors.confirm?.message}>
            <Input
              type="password"
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

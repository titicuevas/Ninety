import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '@/components/AuthLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { FormAlert } from '@/components/FormAlert';
import { PasswordField } from '@/components/PasswordField';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { loginWithGoogle, loginWithPassword } from '@/lib/auth';
import { loginSchema, type LoginForm } from '@/lib/authSchemas';
import { useAuthStore } from '@/stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordResetOk] = useState(
    () => (location.state as { passwordReset?: boolean } | null)?.passwordReset === true,
  );

  useEffect(() => {
    if ((location.state as { passwordReset?: boolean } | null)?.passwordReset) {
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google');
      setGoogleLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setLoading(true);

    try {
      const session = await loginWithPassword(data.email, data.password);
      setSession(session);
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Bienvenido de vuelta" subtitle="Inicia sesión en tu diario futbolero">
      <GoogleSignInButton loading={googleLoading} onClick={() => void handleGoogleSignIn()} className="mb-5" />

      <div className="mb-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">o con email</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="tu@email.com" {...register('email')} />
        </FormField>
        <FormField label="Contraseña" error={errors.password?.message}>
          <PasswordField
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
          />
        </FormField>

        <p className="-mt-2 text-right text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>

        {passwordResetOk ? (
          <p className="text-sm text-primary" role="status">
            Contraseña actualizada. Ya puedes iniciar sesión.
          </p>
        ) : null}
        {error ? <FormAlert>{error}</FormAlert> : null}

        <Button type="submit" loading={loading} className="w-full">
          Iniciar sesión
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </AuthLayout>
  );
}

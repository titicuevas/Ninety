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
import { loginWithGoogle, registerWithPassword } from '@/lib/auth';
import {
  DEFAULT_POST_AUTH_PATH,
  loginPath,
  parseNextParam,
  safeReturnPath,
  saveAuthReturnPath,
} from '@/lib/authReturn';
import { registerSchema, type RegisterForm } from '@/lib/authSchemas';
import {
  claimPendingInvite,
  parseRefParam,
  peekInviteCode,
  saveInviteCode,
} from '@/lib/inviteReferral';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuthStore } from '@/stores/authStore';

function isHomePath(path: string): boolean {
  return path === DEFAULT_POST_AUTH_PATH || path.startsWith(`${DEFAULT_POST_AUTH_PATH}?`);
}

export function RegisterPage() {
  useDocumentTitle('Crear cuenta');
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const nextPath = parseNextParam(location.search);
  const postAuthPath = safeReturnPath(nextPath);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const fromRef = parseRefParam(location.search);
    if (fromRef) saveInviteCode(fromRef);
  }, [location.search]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      saveAuthReturnPath(nextPath);
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
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setLoading(true);

    try {
      const inviteCode = peekInviteCode();
      const result = await registerWithPassword(
        data.email,
        data.password,
        data.display_name,
        inviteCode,
      );
      if (result.session) {
        setSession(result.session);
        // Servidor ya atribuyó si había sesión; consume el código pendiente.
        await claimPendingInvite(result.session.access_token);
        navigate(postAuthPath, {
          replace: true,
          state: isHomePath(postAuthPath) ? { fromRegister: true } : undefined,
        });
      } else {
        navigate('/gracias', { replace: true, state: { email: data.email } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Empieza a construir tu historia futbolera">
      <GoogleSignInButton loading={googleLoading} onClick={() => void handleGoogleSignIn()} className="mb-5" />

      <div className="mb-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">o con email</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Nombre" error={errors.display_name?.message}>
          <Input autoComplete="name" placeholder="Cómo te llaman" {...register('display_name')} />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="tu@email.com" {...register('email')} />
        </FormField>
        <FormField label="Contraseña" error={errors.password?.message}>
          <PasswordField
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            {...register('password')}
          />
        </FormField>
        <FormField label="Confirmar contraseña" error={errors.confirmPassword?.message}>
          <PasswordField
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            {...register('confirmPassword')}
          />
        </FormField>

        {error ? <FormAlert>{error}</FormAlert> : null}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Al crear tu cuenta aceptas los{' '}
          <Link to="/terminos" className="text-primary hover:underline">
            Términos de uso
          </Link>{' '}
          y la{' '}
          <Link to="/privacidad" className="text-primary hover:underline">
            Política de privacidad
          </Link>
          .
        </p>

        <Button type="submit" loading={loading} className="w-full">
          Crear cuenta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link to={loginPath(nextPath)} className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { FormAlert } from '@/components/FormAlert';
import { LegalFooter } from '@/components/LegalFooter';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { loginWithPassword } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              90
            </span>
            <span className="text-xl font-semibold">Ninety</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Inicia sesión en tu diario futbolero</p>
        </div>

        <GoogleSignInButton
          label="Google — próximamente"
          disabled
          className="mb-2 opacity-60"
        />

        <p className="mb-6 text-center text-xs text-muted-foreground">
          Por ahora usa email y contraseña. Google lo activaremos más adelante.
        </p>

        <div className="mb-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">o con email</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} />
          </FormField>
          <FormField label="Contraseña" error={errors.password?.message}>
            <Input type="password" autoComplete="current-password" {...register('password')} />
          </FormField>

          {error && <FormAlert>{error}</FormAlert>}

          <Button type="submit" loading={loading} className="w-full">
            Iniciar sesión
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Regístrate
          </Link>
        </p>

        <LegalFooter className="mt-8" />
      </div>
    </div>
  );
}

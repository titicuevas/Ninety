import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
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

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    navigate('/');
  };

  const signInWithGoogle = async () => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (authError) setError(authError.message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/welcome" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-sm font-bold text-white">
              90
            </span>
            <span className="text-xl font-semibold">Ninety</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-muted">Inicia sesión en tu diario futbolero</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Iniciar sesión
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="secondary" className="w-full" onClick={signInWithGoogle}>
          Continuar con Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}

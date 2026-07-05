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
import { registerWithPassword } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

const registerSchema = z
  .object({
    display_name: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setLoading(true);

    try {
      const result = await registerWithPassword(data.email, data.password, data.display_name);
      if (result.session) {
        setSession(result.session);
        navigate('/profile');
      } else {
        setError(result.message ?? 'Revisa tu email para confirmar la cuenta');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              90
            </span>
            <span className="text-xl font-semibold">Ninety</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Empieza a construir tu historia futbolera</p>
        </div>

        <GoogleSignInButton label="Google — próximamente" disabled className="mb-2 opacity-60" />

        <p className="mb-6 text-center text-xs text-muted-foreground">
          Regístrate con email por ahora. Google llegará más adelante.
        </p>

        <div className="mb-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">o con email</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nombre" error={errors.display_name?.message}>
            <Input autoComplete="name" {...register('display_name')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} />
          </FormField>
          <FormField label="Contraseña" error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </FormField>
          <FormField label="Confirmar contraseña" error={errors.confirmPassword?.message}>
            <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </FormField>

          {error && <FormAlert>{error}</FormAlert>}

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
          <Link to="/login" className="text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>

        <LegalFooter className="mt-8" />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, LogOut, Settings } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { FormAlert } from '@/components/FormAlert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuthInit';
import { apiFetch } from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';

const passwordSchema = z
  .object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string().min(6, 'Mínimo 6 caracteres'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const session = useAuthStore((s) => s.session);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onChangePassword = async (data: PasswordForm) => {
    if (!session?.access_token) return;
    setPasswordError(null);
    setPasswordLoading(true);
    try {
      await apiFetch(
        '/api/auth/change-password',
        { method: 'POST', body: JSON.stringify({ password: data.password }) },
        session.access_token,
      );
      reset({ password: '', confirm: '' });
      toast.success('Contraseña actualizada');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  const onSignOut = async () => {
    setSignOutBusy(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setSignOutBusy(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Settings className="h-6 w-6 text-primary" aria-hidden />
            Ajustes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Cuenta, seguridad y alertas</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Cuenta</CardTitle>
            <CardDescription>Email de acceso (no editable aquí)</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField label="Email">
              <Input type="email" value={user?.email ?? ''} readOnly disabled />
            </FormField>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Cambiar contraseña</CardTitle>
            <CardDescription>Si entraste con Google, configura una contraseña solo si usas email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => void onChangePassword(d))} className="space-y-4">
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
              {passwordError ? <FormAlert>{passwordError}</FormAlert> : null}
              <Button type="submit" loading={passwordLoading}>
                Guardar contraseña
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Notificaciones</CardTitle>
            <CardDescription>Push del navegador y centro de alertas</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link to="/notifications">
                <Bell className="mr-2 h-4 w-4" aria-hidden />
                Ir a notificaciones
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Sesión</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              loading={signOutBusy}
              onClick={() => void onSignOut()}
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden />
              Cerrar sesión
            </Button>
            <Button type="button" variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
              Eliminar cuenta
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar cuenta"
        description="Todavía no hay borrado automático. Te abrimos un email a hello@ninety.app; envíalo desde el correo de tu cuenta y lo gestionamos a mano."
        confirmLabel="Escribir email"
        cancelLabel="Cerrar"
        tone="default"
        onConfirm={() => {
          const email = user?.email ?? '';
          const subject = encodeURIComponent('Solicitud de eliminación de cuenta — Ninety');
          const body = encodeURIComponent(
            [
              'Hola,',
              '',
              'Quiero eliminar mi cuenta de Ninety.',
              email ? `Email de la cuenta: ${email}` : '',
              '',
              'Gracias.',
            ]
              .filter(Boolean)
              .join('\n'),
          );
          window.location.href = `mailto:hello@ninety.app?subject=${subject}&body=${body}`;
          setDeleteOpen(false);
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </Layout>
  );
}

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, Download, LogOut, Settings, Upload } from 'lucide-react';
import { DirtyLeaveDialog } from '@/components/DirtyLeaveDialog';
import { FormAlert, FormSuccess } from '@/components/FormAlert';
import { Layout } from '@/components/Layout';
import { PasswordField } from '@/components/PasswordField';
import { DiaryAnniversaryPrefsPanel } from '@/components/DiaryAnniversaryPrefsPanel';
import { DiaryDigestPrefsPanel } from '@/components/DiaryDigestPrefsPanel';
import { DiaryMilestonePrefsPanel } from '@/components/DiaryMilestonePrefsPanel';
import { NotificationTypePrefsPanel } from '@/components/NotificationTypePrefsPanel';
import { PushAlertsPanel } from '@/components/PushAlertsPanel';
import { InstallAppPanel } from '@/components/InstallAppPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuthInit';
import { useDirtyLeave } from '@/hooks/useDirtyLeave';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { apiFetch } from '@/lib/api';
import { passwordConfirmSchema, type PasswordConfirmForm } from '@/lib/authSchemas';
import { downloadDiaryExport, type DiaryExportFormat } from '@/lib/diaryExport';
import { readDiaryImportFile, uploadDiaryImport } from '@/lib/diaryImport';
import { markDiaryImported } from '@/lib/diaryPostImportMemory';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';

export function SettingsPage() {
  useDocumentTitle('Ajustes');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const session = useAuthStore((s) => s.session);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState<DiaryExportFormat | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const deleteTitleId = useId();
  const deleteDescId = useId();
  const importInputId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PasswordConfirmForm>({
    resolver: zodResolver(passwordConfirmSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const { leaveOpen, confirmLeave, dismissLeave } = useDirtyLeave({
    isDirty,
    isBusy: passwordLoading,
  });

  const accountEmail = (user?.email ?? '').trim().toLowerCase();
  const deleteReady =
    !!accountEmail && deleteConfirm.trim().toLowerCase() === accountEmail;

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (deleteOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [deleteOpen]);

  const closeDeleteDialog = () => {
    setDeleteOpen(false);
    setDeleteConfirm('');
  };

  const onChangePassword = async (data: PasswordConfirmForm) => {
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

  const onExport = async (format: DiaryExportFormat) => {
    if (!session?.access_token) return;
    setExportBusy(format);
    try {
      await downloadDiaryExport(format, session.access_token);
      toast.success(format === 'csv' ? 'CSV descargado' : 'JSON descargado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo exportar el diario');
    } finally {
      setExportBusy(null);
    }
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file || !session?.access_token) return;
    setImportError(null);
    setImportSuccess(null);
    setImportBusy(true);
    try {
      const payload = await readDiaryImportFile(file);
      const result = await uploadDiaryImport(payload, session.access_token);
      if (user?.id && result.imported > 0) {
        markDiaryImported(user.id, { importedCount: result.imported });
      }
      void queryClient.invalidateQueries({ queryKey: ['capsules'] });
      setImportSuccess(result.message);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo importar el diario');
    } finally {
      setImportBusy(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const openDeleteMailto = () => {
    if (!deleteReady) return;
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
    window.location.href = `mailto:hello@getninety.app?subject=${subject}&body=${body}`;
    closeDeleteDialog();
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
            <CardDescription>
              Si entraste con Google, configura una contraseña solo si usas email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => void onChangePassword(d))} className="space-y-4">
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
              {passwordError ? <FormAlert>{passwordError}</FormAlert> : null}
              <Button type="submit" loading={passwordLoading}>
                Guardar contraseña
              </Button>
            </form>
          </CardContent>
        </Card>

        <InstallAppPanel />

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Notificaciones</CardTitle>
            <CardDescription>
              Push del dispositivo y silenciado por tipo (likes, comentarios, seguidores). El
              historial vive en el centro de alertas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PushAlertsPanel variant="card" />
            <NotificationTypePrefsPanel />
            <DiaryDigestPrefsPanel />
            <DiaryAnniversaryPrefsPanel />
            <DiaryMilestonePrefsPanel />
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/notifications">
                <Bell className="mr-2 h-4 w-4" aria-hidden />
                Ver centro de alertas
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Exportar e importar diario</CardTitle>
            <CardDescription>
              Descarga tus Capsules en JSON o CSV, o restaura desde un export JSON. Solo tus datos;
              sin contraseñas ni tokens. Las colecciones no se incluyen. Las Capsules con el mismo
              partido ya guardado se omiten. En v1 no se re-suben fotos remotas (quedan vacías al
              importar).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                loading={exportBusy === 'json'}
                disabled={exportBusy != null || importBusy}
                onClick={() => void onExport('json')}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Descargar JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={exportBusy === 'csv'}
                disabled={exportBusy != null || importBusy}
                onClick={() => void onExport('csv')}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Descargar CSV
              </Button>
              <input
                ref={importInputRef}
                id={importInputId}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={importBusy || exportBusy != null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void onImportFile(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                loading={importBusy}
                disabled={importBusy || exportBusy != null}
                onClick={() => importInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                Importar JSON
              </Button>
            </div>
            {importError ? <FormAlert>{importError}</FormAlert> : null}
            {importSuccess ? (
              <div className="space-y-2">
                <FormSuccess>{importSuccess}</FormSuccess>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/home">Ver guía en Inicio</Link>
                </Button>
              </div>
            ) : null}
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
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={() => {
                setDeleteConfirm('');
                setDeleteOpen(true);
              }}
            >
              Eliminar cuenta
            </Button>
          </CardContent>
        </Card>
      </div>

      <dialog
        ref={deleteDialogRef}
        aria-labelledby={deleteTitleId}
        aria-describedby={deleteDescId}
        className="fixed inset-0 z-50 m-auto w-[min(100%-2rem,28rem)] rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/60 open:flex open:flex-col"
        onCancel={(event) => {
          event.preventDefault();
          closeDeleteDialog();
        }}
        onClick={(event) => {
          if (event.target === deleteDialogRef.current) closeDeleteDialog();
        }}
      >
        <div className="space-y-4 p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <h2 id={deleteTitleId} className="text-lg font-semibold">
              Eliminar cuenta
            </h2>
            <p id={deleteDescId} className="text-sm text-muted-foreground">
              Todavía no hay borrado automático. Para abrir el email a{' '}
              <span className="text-foreground">hello@getninety.app</span>, escribe tu email de cuenta
              debajo.
            </p>
          </div>
          <FormField label="Escribe tu email para confirmar">
            <Input
              type="email"
              autoComplete="off"
              placeholder={user?.email ?? 'tu@email.com'}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              aria-label="Confirmar email para eliminar cuenta"
            />
          </FormField>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11" onClick={closeDeleteDialog}>
              Cerrar
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={!deleteReady}
              onClick={openDeleteMailto}
            >
              Escribir email
            </Button>
          </div>
        </div>
      </dialog>

      <DirtyLeaveDialog
        open={leaveOpen}
        description="Perderás la contraseña nueva que estabas escribiendo."
        onConfirm={confirmLeave}
        onCancel={dismissLeave}
      />
    </Layout>
  );
}

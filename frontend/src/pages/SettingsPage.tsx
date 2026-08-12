import { useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
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
import { PushQuietHoursPanel } from '@/components/PushQuietHoursPanel';
import { MutedUsersPanel } from '@/components/MutedUsersPanel';
import { BlockedUsersPanel } from '@/components/BlockedUsersPanel';
import { PushAlertsPanel } from '@/components/PushAlertsPanel';
import { InstallAppPanel } from '@/components/InstallAppPanel';
import { ShareInviteButton } from '@/components/ShareInviteButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/hooks/useAuthInit';
import { useDirtyLeave } from '@/hooks/useDirtyLeave';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfile } from '@/hooks/useProfile';
import { apiFetch } from '@/lib/api';
import { inviteUrl } from '@/lib/inviteReferral';
import { isAutoUsername } from '@/lib/profileHelpers';
import { passwordConfirmSchema, type PasswordConfirmForm } from '@/lib/authSchemas';
import { downloadCollectionsExport } from '@/lib/collectionsExport';
import { readCollectionsImportFile, uploadCollectionsImport } from '@/lib/collectionsImport';
import { downloadDiaryExport, type DiaryExportFormat } from '@/lib/diaryExport';
import { readDiaryImportFile, uploadDiaryImport } from '@/lib/diaryImport';
import { deleteAccount } from '@/lib/deleteAccount';
import { markDiaryImported } from '@/lib/diaryPostImportMemory';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';

export function SettingsPage() {
  useDocumentTitle('Ajustes');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const session = useAuthStore((s) => s.session);
  const { data: profile } = useProfile();
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState<DiaryExportFormat | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importRestorePhotos, setImportRestorePhotos] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [collectionsExportBusy, setCollectionsExportBusy] = useState(false);
  const [collectionsImportBusy, setCollectionsImportBusy] = useState(false);
  const [collectionsImportError, setCollectionsImportError] = useState<string | null>(null);
  const [collectionsImportSuccess, setCollectionsImportSuccess] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const importInputId = useId();
  const collectionsImportInputRef = useRef<HTMLInputElement>(null);
  const collectionsImportInputId = useId();

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

  const closeDeleteDialog = () => {
    setDeleteOpen(false);
    setDeleteConfirm('');
    setDeleteError(null);
  };

  const onDeleteAccount = async () => {
    if (!deleteReady || !session?.access_token) return;
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      await deleteAccount(deleteConfirm, session.access_token);
      closeDeleteDialog();
      await signOut();
      navigate('/login', { replace: true });
      toast.success('Cuenta eliminada');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta');
    } finally {
      setDeleteBusy(false);
    }
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
      const result = await uploadDiaryImport(payload, session.access_token, {
        restorePhotos: importRestorePhotos,
      });
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

  const onCollectionsExport = async () => {
    if (!session?.access_token) return;
    setCollectionsExportBusy(true);
    try {
      await downloadCollectionsExport(session.access_token);
      toast.success('Colecciones descargadas');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron exportar las colecciones');
    } finally {
      setCollectionsExportBusy(false);
    }
  };

  const onCollectionsImportFile = async (file: File | undefined) => {
    if (!file || !session?.access_token) return;
    setCollectionsImportError(null);
    setCollectionsImportSuccess(null);
    setCollectionsImportBusy(true);
    try {
      const payload = await readCollectionsImportFile(file);
      const result = await uploadCollectionsImport(payload, session.access_token);
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
      setCollectionsImportSuccess(result.message);
    } catch (err) {
      setCollectionsImportError(
        err instanceof Error ? err.message : 'No se pudieron importar las colecciones',
      );
    } finally {
      setCollectionsImportBusy(false);
      if (collectionsImportInputRef.current) collectionsImportInputRef.current.value = '';
    }
  };

  const portabilityBusy =
    exportBusy != null || importBusy || collectionsExportBusy || collectionsImportBusy;

  const onDeleteAccountClick = () => {
    void onDeleteAccount();
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
            <CardTitle className="text-base">Invitar a Ninety</CardTitle>
            <CardDescription>
              Comparte tu enlace. Quien se registre desde él quedará atribuido a tu invitación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile?.username && !isAutoUsername(profile.username) ? (
              <>
                <p className="break-all rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  {inviteUrl(profile.username)}
                </p>
                <ShareInviteButton
                  username={profile.username}
                  displayName={profile.display_name}
                  size="default"
                  variant="default"
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Elige un username en{' '}
                <Link to="/profile" className="text-primary hover:underline">
                  Perfil
                </Link>{' '}
                para generar tu enlace de invitación.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Notificaciones</CardTitle>
            <CardDescription>
              Push del dispositivo, horario silencioso, silenciado por tipo y por usuario. El
              historial vive en el centro de alertas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PushAlertsPanel variant="card" />
            <PushQuietHoursPanel />
            <NotificationTypePrefsPanel />
            <MutedUsersPanel />
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
            <CardTitle className="text-base">Bloqueos</CardTitle>
            <CardDescription>
              Deja de ver el perfil y las Capsules de alguien. Más fuerte que silenciar alertas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BlockedUsersPanel />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Exportar e importar diario</CardTitle>
            <CardDescription>
              Descarga tus Capsules en JSON o CSV, o restaura desde un export JSON. Solo tus datos;
              sin contraseñas ni tokens. Las colecciones van en la sección de abajo. Las Capsules con
              el mismo partido ya guardado se omiten. Opcionalmente puedes restaurar fotos desde las
              URLs del export (solo http/https accesibles; máx. 9 por Capsule y 200 por import).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={importRestorePhotos}
                onChange={(e) => setImportRestorePhotos(e.target.checked)}
                disabled={portabilityBusy}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              />
              <span>
                Restaurar fotos desde URLs del export{' '}
                <span className="text-muted-foreground">
                  (re-sube imágenes remotas; URLs caducadas o privadas se omiten sin bloquear el
                  import)
                </span>
              </span>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                loading={exportBusy === 'json'}
                disabled={portabilityBusy}
                onClick={() => void onExport('json')}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Descargar JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={exportBusy === 'csv'}
                disabled={portabilityBusy}
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
                disabled={portabilityBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void onImportFile(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                loading={importBusy}
                disabled={portabilityBusy}
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
            <CardTitle className="text-base">Exportar e importar colecciones</CardTitle>
            <CardDescription>
              Backup GDPR de tus listas curadas (nombre, slug, orden y portada por partido). Los
              ítems se enlazan por <span className="text-foreground">match_id</span>: importa antes
              el diario si hace falta. Las colecciones con el mismo slug ya existentes se omiten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                loading={collectionsExportBusy}
                disabled={portabilityBusy}
                onClick={() => void onCollectionsExport()}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Descargar colecciones
              </Button>
              <input
                ref={collectionsImportInputRef}
                id={collectionsImportInputId}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={portabilityBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  void onCollectionsImportFile(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                loading={collectionsImportBusy}
                disabled={portabilityBusy}
                onClick={() => collectionsImportInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                Importar colecciones
              </Button>
            </div>
            {collectionsImportError ? <FormAlert>{collectionsImportError}</FormAlert> : null}
            {collectionsImportSuccess ? (
              <div className="space-y-2">
                <FormSuccess>{collectionsImportSuccess}</FormSuccess>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/collections">Ver colecciones</Link>
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

      <Modal open={deleteOpen} title="Eliminar cuenta" onClose={closeDeleteDialog}>
        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-sm text-muted-foreground">
            Se borrarán tu perfil, diario, colecciones, alertas y fotos subidas. Esta acción no se
            puede deshacer. Escribe tu email de cuenta para confirmar.
          </p>
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
          {deleteError ? <FormAlert>{deleteError}</FormAlert> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={deleteBusy}
              onClick={closeDeleteDialog}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={!deleteReady}
              loading={deleteBusy}
              onClick={onDeleteAccountClick}
            >
              Eliminar cuenta
            </Button>
          </div>
        </div>
      </Modal>

      <DirtyLeaveDialog
        open={leaveOpen}
        description="Perderás la contraseña nueva que estabas escribiendo."
        onConfirm={confirmLeave}
        onCancel={dismissLeave}
      />
    </Layout>
  );
}

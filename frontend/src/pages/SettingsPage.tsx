import { useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState, useEffect, type RefObject } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, LogOut, Settings, Upload } from 'lucide-react';
import { DirtyLeaveDialog } from '@/components/DirtyLeaveDialog';
import { FormAlert, FormSuccess } from '@/components/FormAlert';
import { Layout } from '@/components/Layout';
import { PasswordField } from '@/components/PasswordField';
import { DiaryAnniversaryPrefsPanel } from '@/components/DiaryAnniversaryPrefsPanel';
import { DiaryDigestPrefsPanel } from '@/components/DiaryDigestPrefsPanel';
import { DiaryMilestonePrefsPanel } from '@/components/DiaryMilestonePrefsPanel';
import { EmailDigestPrefsPanel } from '@/components/EmailDigestPrefsPanel';
import { WantToGoPushPrefsPanel } from '@/components/WantToGoPushPrefsPanel';
import { NotificationTypePrefsPanel } from '@/components/NotificationTypePrefsPanel';
import { PushQuietHoursPanel } from '@/components/PushQuietHoursPanel';
import { MutedUsersPanel } from '@/components/MutedUsersPanel';
import { BlockedUsersPanel } from '@/components/BlockedUsersPanel';
import { PushAlertsPanel } from '@/components/PushAlertsPanel';
import { InstallAppPanel } from '@/components/InstallAppPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/hooks/useAuthInit';
import { useDirtyLeave } from '@/hooks/useDirtyLeave';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { apiFetch } from '@/lib/api';
import { passwordConfirmSchema, type PasswordConfirmForm } from '@/lib/authSchemas';
import { downloadCollectionsExport } from '@/lib/collectionsExport';
import { readCollectionsImportFile, uploadCollectionsImport } from '@/lib/collectionsImport';
import { downloadDiaryExport, type DiaryExportFormat } from '@/lib/diaryExport';
import { readDiaryImportFile, uploadDiaryImport } from '@/lib/diaryImport';
import { deleteAccount } from '@/lib/deleteAccount';
import { markDiaryImported } from '@/lib/diaryPostImportMemory';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';

function SettingsDataPortabilityCard({
  importRestorePhotos,
  onImportRestorePhotosChange,
  exportBusy,
  importBusy,
  collectionsExportBusy,
  collectionsImportBusy,
  portabilityBusy,
  importInputRef,
  importInputId,
  collectionsImportInputRef,
  collectionsImportInputId,
  onExport,
  onImportFile,
  onCollectionsExport,
  onCollectionsImportFile,
  importError,
  importSuccess,
  collectionsImportError,
  collectionsImportSuccess,
}: {
  importRestorePhotos: boolean;
  onImportRestorePhotosChange: (value: boolean) => void;
  exportBusy: DiaryExportFormat | null;
  importBusy: boolean;
  collectionsExportBusy: boolean;
  collectionsImportBusy: boolean;
  portabilityBusy: boolean;
  importInputRef: RefObject<HTMLInputElement | null>;
  importInputId: string;
  collectionsImportInputRef: RefObject<HTMLInputElement | null>;
  collectionsImportInputId: string;
  onExport: (format: DiaryExportFormat) => void;
  onImportFile: (file: File | undefined) => void;
  onCollectionsExport: () => void;
  onCollectionsImportFile: (file: File | undefined) => void;
  importError: string | null;
  importSuccess: string | null;
  collectionsImportError: string | null;
  collectionsImportSuccess: string | null;
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Datos</CardTitle>
        <CardDescription>
          Backup GDPR de tu diario y listas. Sin contraseñas ni tokens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-4" aria-labelledby="export-diary-heading">
          <div>
            <h2 id="export-diary-heading" className="text-sm font-medium">
              Exportar e importar diario
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              JSON o CSV. Las Capsules del mismo partido se omiten. Fotos opcionales desde URLs
              http/https (máx. 9 por Capsule, 200 por import).
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={importRestorePhotos}
              onChange={(e) => onImportRestorePhotosChange(e.target.checked)}
              disabled={portabilityBusy}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
            />
            <span>
              Restaurar fotos desde URLs del export{' '}
              <span className="text-muted-foreground">(las caducadas se omiten)</span>
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
              aria-label="Elegir archivo JSON del diario"
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
        </section>

        <section className="space-y-4" aria-labelledby="export-collections-heading">
          <div>
            <h2 id="export-collections-heading" className="text-sm font-medium">
              Exportar e importar colecciones
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Listas por match_id. Importa antes el diario si hace falta. Slugs existentes se
              omiten.
            </p>
          </div>
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
              aria-label="Elegir archivo JSON de colecciones"
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
        </section>
      </CardContent>
    </Card>
  );
}

function SettingsDeleteAccountModal({
  open,
  userEmail,
  deleteConfirm,
  onDeleteConfirmChange,
  deleteError,
  deleteReady,
  deleteBusy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  userEmail: string | undefined;
  deleteConfirm: string;
  onDeleteConfirmChange: (value: string) => void;
  deleteError: string | null;
  deleteReady: boolean;
  deleteBusy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} title="Eliminar cuenta" onClose={onClose}>
      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-sm text-muted-foreground">
          Se borrarán tu perfil, diario, colecciones, alertas y fotos subidas. Esta acción no se
          puede deshacer. Escribe tu email de cuenta para confirmar.
        </p>
        <FormField label="Escribe tu email para confirmar">
          <Input
            type="email"
            autoComplete="off"
            placeholder={userEmail ?? 'tu@email.com'}
            value={deleteConfirm}
            onChange={(e) => onDeleteConfirmChange(e.target.value)}
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
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            disabled={!deleteReady}
            loading={deleteBusy}
            onClick={onConfirm}
          >
            Eliminar cuenta
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SettingsAccountPasswordCard({
  userEmail,
  register,
  errors,
  passwordError,
  passwordLoading,
  onSubmit,
  handleSubmit,
}: {
  userEmail: string | undefined;
  register: ReturnType<typeof useForm<PasswordConfirmForm>>['register'];
  errors: ReturnType<typeof useForm<PasswordConfirmForm>>['formState']['errors'];
  passwordError: string | null;
  passwordLoading: boolean;
  onSubmit: (data: PasswordConfirmForm) => void;
  handleSubmit: ReturnType<typeof useForm<PasswordConfirmForm>>['handleSubmit'];
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Cuenta</CardTitle>
        <CardDescription>Email de acceso y contraseña</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField label="Email">
          <Input type="email" value={userEmail ?? ''} readOnly disabled />
        </FormField>
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
          {passwordError ? <FormAlert>{passwordError}</FormAlert> : null}
          <Button type="submit" loading={passwordLoading}>
            Guardar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SettingsNotificationsCard() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Notificaciones</CardTitle>
        <CardDescription>Push, silenciado y resúmenes. El historial está en la campana.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PushAlertsPanel variant="card" />
        <PushQuietHoursPanel />
        <NotificationTypePrefsPanel />
        <MutedUsersPanel />
        <DiaryDigestPrefsPanel />
        <EmailDigestPrefsPanel />
        <WantToGoPushPrefsPanel />
        <DiaryAnniversaryPrefsPanel />
        <DiaryMilestonePrefsPanel />
      </CardContent>
    </Card>
  );
}

function useSettingsDataPortability(
  sessionToken: string | undefined,
  userId: string | undefined,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  const [exportBusy, setExportBusy] = useState<DiaryExportFormat | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importRestorePhotos, setImportRestorePhotos] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [collectionsExportBusy, setCollectionsExportBusy] = useState(false);
  const [collectionsImportBusy, setCollectionsImportBusy] = useState(false);
  const [collectionsImportError, setCollectionsImportError] = useState<string | null>(null);
  const [collectionsImportSuccess, setCollectionsImportSuccess] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const importInputId = useId();
  const collectionsImportInputRef = useRef<HTMLInputElement>(null);
  const collectionsImportInputId = useId();

  const onExport = async (format: DiaryExportFormat) => {
    if (!sessionToken) return;
    setExportBusy(format);
    try {
      await downloadDiaryExport(format, sessionToken);
      toast.success(format === 'csv' ? 'CSV descargado' : 'JSON descargado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo exportar el diario');
    } finally {
      setExportBusy(null);
    }
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file || !sessionToken) return;
    setImportError(null);
    setImportSuccess(null);
    setImportBusy(true);
    try {
      const payload = await readDiaryImportFile(file);
      const result = await uploadDiaryImport(payload, sessionToken, {
        restorePhotos: importRestorePhotos,
      });
      if (userId && result.imported > 0) {
        markDiaryImported(userId, { importedCount: result.imported });
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
    if (!sessionToken) return;
    setCollectionsExportBusy(true);
    try {
      await downloadCollectionsExport(sessionToken);
      toast.success('Colecciones descargadas');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron exportar las colecciones');
    } finally {
      setCollectionsExportBusy(false);
    }
  };

  const onCollectionsImportFile = async (file: File | undefined) => {
    if (!file || !sessionToken) return;
    setCollectionsImportError(null);
    setCollectionsImportSuccess(null);
    setCollectionsImportBusy(true);
    try {
      const payload = await readCollectionsImportFile(file);
      const result = await uploadCollectionsImport(payload, sessionToken);
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

  return {
    exportBusy,
    importBusy,
    importRestorePhotos,
    setImportRestorePhotos,
    importError,
    importSuccess,
    collectionsExportBusy,
    collectionsImportBusy,
    collectionsImportError,
    collectionsImportSuccess,
    importInputRef,
    importInputId,
    collectionsImportInputRef,
    collectionsImportInputId,
    onExport,
    onImportFile,
    onCollectionsExport,
    onCollectionsImportFile,
    portabilityBusy,
  };
}

export function SettingsPage() {
  useDocumentTitle('Ajustes');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const session = useAuthStore((s) => s.session);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const portability = useSettingsDataPortability(session?.access_token, user?.id, queryClient);

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

  useEffect(() => {
    const status = searchParams.get('email_digest');
    if (status !== 'off' && status !== 'invalid') return;
    if (status === 'off') {
      toast.success('Resumen semanal por email desactivado');
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    } else {
      toast.error('Enlace de baja no válido');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('email_digest');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, queryClient]);

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

  const onDeleteAccountClick = () => {
    void onDeleteAccount();
  };

  return (
    <Layout>
      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Settings className="h-6 w-6 text-primary" aria-hidden />
            Ajustes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Cuenta, seguridad y alertas</p>
        </div>

        <SettingsAccountPasswordCard
          userEmail={user?.email}
          register={register}
          errors={errors}
          passwordError={passwordError}
          passwordLoading={passwordLoading}
          onSubmit={onChangePassword}
          handleSubmit={handleSubmit}
        />

        <InstallAppPanel />

        <SettingsNotificationsCard />

        <Card className="border-border">
          <CardContent className="p-5">
            <BlockedUsersPanel />
          </CardContent>
        </Card>

        <SettingsDataPortabilityCard
          importRestorePhotos={portability.importRestorePhotos}
          onImportRestorePhotosChange={portability.setImportRestorePhotos}
          exportBusy={portability.exportBusy}
          importBusy={portability.importBusy}
          collectionsExportBusy={portability.collectionsExportBusy}
          collectionsImportBusy={portability.collectionsImportBusy}
          portabilityBusy={portability.portabilityBusy}
          importInputRef={portability.importInputRef}
          importInputId={portability.importInputId}
          collectionsImportInputRef={portability.collectionsImportInputRef}
          collectionsImportInputId={portability.collectionsImportInputId}
          onExport={portability.onExport}
          onImportFile={portability.onImportFile}
          onCollectionsExport={portability.onCollectionsExport}
          onCollectionsImportFile={portability.onCollectionsImportFile}
          importError={portability.importError}
          importSuccess={portability.importSuccess}
          collectionsImportError={portability.collectionsImportError}
          collectionsImportSuccess={portability.collectionsImportSuccess}
        />

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

      <SettingsDeleteAccountModal
        open={deleteOpen}
        userEmail={user?.email}
        deleteConfirm={deleteConfirm}
        onDeleteConfirmChange={setDeleteConfirm}
        deleteError={deleteError}
        deleteReady={deleteReady}
        deleteBusy={deleteBusy}
        onClose={closeDeleteDialog}
        onConfirm={onDeleteAccountClick}
      />

      <DirtyLeaveDialog
        open={leaveOpen}
        description="Perderás la contraseña nueva que estabas escribiendo."
        onConfirm={confirmLeave}
        onCancel={dismissLeave}
      />
    </Layout>
  );
}

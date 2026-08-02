import { useEffect, useState } from 'react';
import { Download, MonitorSmartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|Chrome|Firefox|EdgiOS/.test(ua);
  return iOS && webkit && !chrome;
}

/**
 * Panel de instalación PWA en Ajustes.
 * Usa beforeinstallprompt cuando existe; en iOS muestra instrucciones manuales.
 */
export function InstallAppPanel() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());
  const [busy, setBusy] = useState(false);
  const ios = isIosSafari();

  useEffect(() => {
    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onInstall = async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MonitorSmartphone className="h-4 w-4 text-primary" aria-hidden />
          Instalar Ninety
        </CardTitle>
        <CardDescription>
          Añade la app a la pantalla de inicio. Funciona offline con el shell básico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {installed ? (
          <p className="text-sm text-muted-foreground">Ya estás usando Ninety instalada.</p>
        ) : deferred ? (
          <Button type="button" loading={busy} onClick={() => void onInstall()}>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Añadir a pantalla de inicio
          </Button>
        ) : ios ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Pulsa <span className="text-foreground">Compartir</span> en Safari
            </li>
            <li>
              Elige <span className="text-foreground">Añadir a pantalla de inicio</span>
            </li>
            <li>Confirma con Añadir</li>
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Si tu navegador lo permite, aparecerá aquí el botón de instalación. También puedes usar
            el menú del navegador → «Instalar app» / «Añadir a pantalla de inicio».
          </p>
        )}
      </CardContent>
    </Card>
  );
}

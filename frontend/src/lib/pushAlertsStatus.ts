export type PushPermissionState = NotificationPermission | 'unsupported';

export type PushPermissionLabel = 'Permitidas' | 'Bloqueadas' | 'Pendientes' | 'No compatible';

export function pushPermissionLabel(permission: PushPermissionState | undefined): PushPermissionLabel {
  if (permission === 'granted') return 'Permitidas';
  if (permission === 'denied') return 'Bloqueadas';
  if (permission === 'default') return 'Pendientes';
  return 'No compatible';
}

export function shouldShowPushDiagnostics(opts: {
  canEnablePush: boolean;
  permission: PushPermissionState | undefined;
}): boolean {
  return !opts.canEnablePush || opts.permission === 'denied';
}

export type PushAlertsMode =
  | 'unsupported'
  | 'server_unavailable'
  | 'permission_denied'
  | 'ready_off'
  | 'ready_on';

export function resolvePushAlertsMode(opts: {
  canEnablePush: boolean;
  pushEnabled: boolean;
  supported: boolean | undefined;
  permission: PushPermissionState | undefined;
}): PushAlertsMode {
  if (opts.supported === false || opts.permission === 'unsupported') return 'unsupported';
  if (!opts.canEnablePush) return 'server_unavailable';
  if (opts.permission === 'denied') return 'permission_denied';
  if (opts.pushEnabled) return 'ready_on';
  return 'ready_off';
}

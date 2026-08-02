import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  pushPermissionLabel,
  resolvePushAlertsMode,
  shouldShowPushDiagnostics,
} from './pushAlertsStatus.ts';

describe('pushAlertsStatus', () => {
  it('labels permission states for UI copy', () => {
    assert.equal(pushPermissionLabel('granted'), 'Permitidas');
    assert.equal(pushPermissionLabel('denied'), 'Bloqueadas');
    assert.equal(pushPermissionLabel('default'), 'Pendientes');
    assert.equal(pushPermissionLabel('unsupported'), 'No compatible');
    assert.equal(pushPermissionLabel(undefined), 'No compatible');
  });

  it('shows diagnostics when server is down or permission denied', () => {
    assert.equal(shouldShowPushDiagnostics({ canEnablePush: false, permission: 'default' }), true);
    assert.equal(shouldShowPushDiagnostics({ canEnablePush: true, permission: 'denied' }), true);
    assert.equal(shouldShowPushDiagnostics({ canEnablePush: true, permission: 'granted' }), false);
    assert.equal(shouldShowPushDiagnostics({ canEnablePush: true, permission: 'default' }), false);
  });

  it('resolves actionable push modes', () => {
    assert.equal(
      resolvePushAlertsMode({
        canEnablePush: true,
        pushEnabled: false,
        supported: false,
        permission: 'unsupported',
      }),
      'unsupported',
    );
    assert.equal(
      resolvePushAlertsMode({
        canEnablePush: false,
        pushEnabled: false,
        supported: true,
        permission: 'default',
      }),
      'server_unavailable',
    );
    assert.equal(
      resolvePushAlertsMode({
        canEnablePush: true,
        pushEnabled: false,
        supported: true,
        permission: 'denied',
      }),
      'permission_denied',
    );
    assert.equal(
      resolvePushAlertsMode({
        canEnablePush: true,
        pushEnabled: false,
        supported: true,
        permission: 'default',
      }),
      'ready_off',
    );
    assert.equal(
      resolvePushAlertsMode({
        canEnablePush: true,
        pushEnabled: true,
        supported: true,
        permission: 'granted',
      }),
      'ready_on',
    );
  });
});

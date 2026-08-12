import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { blockUserButtonLabel } from './blockUser.ts';

describe('blockUserButtonLabel', () => {
  it('muestra Bloquear cuando no está bloqueado', () => {
    assert.equal(blockUserButtonLabel({ blocked: false }), 'Bloquear');
  });

  it('muestra Desbloquear cuando ya está bloqueado', () => {
    assert.equal(blockUserButtonLabel({ blocked: true }), 'Desbloquear');
  });

  it('prioriza estados de carga', () => {
    assert.equal(blockUserButtonLabel({ blocked: false, blocking: true }), 'Bloqueando…');
    assert.equal(blockUserButtonLabel({ blocked: true, blocking: true }), 'Bloqueando…');
    assert.equal(blockUserButtonLabel({ blocked: false, unblocking: true }), 'Desbloqueando…');
    assert.equal(blockUserButtonLabel({ blocked: true, unblocking: true }), 'Desbloqueando…');
  });

  it('prioriza unblocking sobre blocking', () => {
    assert.equal(
      blockUserButtonLabel({ blocked: true, blocking: true, unblocking: true }),
      'Desbloqueando…',
    );
  });
});

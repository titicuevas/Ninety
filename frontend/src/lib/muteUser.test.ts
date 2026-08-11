import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { muteUserButtonLabel } from './muteUser';

describe('muteUserButtonLabel', () => {
  it('muestra Silenciar alertas cuando no está silenciado', () => {
    assert.equal(muteUserButtonLabel({ muted: false }), 'Silenciar alertas');
  });

  it('muestra Dejar de silenciar cuando ya está silenciado', () => {
    assert.equal(muteUserButtonLabel({ muted: true }), 'Dejar de silenciar');
  });

  it('muestra Silenciando… mientras el mute está en curso', () => {
    assert.equal(muteUserButtonLabel({ muted: false, muting: true }), 'Silenciando…');
    assert.equal(muteUserButtonLabel({ muted: true, muting: true }), 'Silenciando…');
  });

  it('muestra Reactivando… mientras el unmute está en curso', () => {
    assert.equal(muteUserButtonLabel({ muted: false, unmuting: true }), 'Reactivando…');
    assert.equal(muteUserButtonLabel({ muted: true, unmuting: true }), 'Reactivando…');
  });

  it('prioriza Reactivando… si ambos pending flags vienen activos', () => {
    assert.equal(
      muteUserButtonLabel({ muted: true, muting: true, unmuting: true }),
      'Reactivando…',
    );
  });
});

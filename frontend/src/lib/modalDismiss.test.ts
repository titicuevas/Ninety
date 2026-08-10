import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dismissModal } from './modalDismiss';

describe('dismissModal', () => {
  it('llama onClose al pulsar Cerrar (contrato del botón)', () => {
    let closed = false;
    dismissModal({ onClose: () => { closed = true; } });
    assert.equal(closed, true);
  });

  it('cierra nativo y luego setState', () => {
    const order: string[] = [];
    dismissModal({
      closeNative: () => order.push('native'),
      onClose: () => order.push('state'),
    });
    assert.deepEqual(order, ['native', 'state']);
  });

  it('busy/loading NO bloquea Cerrar', () => {
    let closed = false;
    dismissModal({
      busy: true,
      onClose: () => { closed = true; },
    });
    assert.equal(closed, true);
  });
});

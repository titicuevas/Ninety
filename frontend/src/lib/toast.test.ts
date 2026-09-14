import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { __resetToastsForTests, dismissToast, subscribeToasts, toast } from './toast.ts';

// toast.ts usa window.setTimeout (DOM). En node:test no hay window.
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    configurable: true,
  });
}

describe('toast', () => {
  afterEach(() => {
    __resetToastsForTests();
  });

  it('no apila el mismo error: reutiliza el toast', () => {
    const snapshots: number[] = [];
    const unsub = subscribeToasts((items) => snapshots.push(items.length));

    const a = toast.error('El comentario incluye lenguaje ofensivo.');
    const b = toast.error('El comentario incluye lenguaje ofensivo.');
    assert.equal(a, b);
    assert.equal(snapshots.at(-1), 1);
    unsub();
  });

  it('sí permite toasts con mensajes distintos, con tope', () => {
    let count = 0;
    const unsub = subscribeToasts((items) => {
      count = items.length;
    });

    toast.error('uno');
    toast.error('dos');
    toast.error('tres');
    toast.error('cuatro');
    assert.equal(count, 3);
    unsub();
  });

  it('dismiss quita el toast', () => {
    let items: { id: string }[] = [];
    const unsub = subscribeToasts((next) => {
      items = next;
    });
    const id = toast.success('ok');
    assert.equal(items.length, 1);
    dismissToast(id);
    assert.equal(items.length, 0);
    unsub();
  });
});

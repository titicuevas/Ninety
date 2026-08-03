import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dismissWrappedTeaser,
  readWrappedTeaserState,
  shouldShowWrappedTeaser,
  WRAPPED_TEASER_SOFT_DISMISS_MS,
} from './wrappedTeaserMemory.ts';

const store = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  },
});

describe('wrappedTeaserMemory', () => {
  it('muestra el teaser si no hay dismiss', () => {
    store.clear();
    assert.equal(shouldShowWrappedTeaser(null), true);
    assert.equal(shouldShowWrappedTeaser({}), true);
  });

  it('oculta tras Ahora no y vuelve tras la ventana soft', () => {
    store.clear();
    const state = dismissWrappedTeaser('user-1');
    assert.ok(state?.dismissedAt);
    assert.equal(shouldShowWrappedTeaser(state), false);
    assert.equal(shouldShowWrappedTeaser(readWrappedTeaserState('user-1')), false);

    const old = {
      dismissedAt: new Date(Date.now() - WRAPPED_TEASER_SOFT_DISMISS_MS - 1000).toISOString(),
    };
    assert.equal(shouldShowWrappedTeaser(old), true);
  });
});

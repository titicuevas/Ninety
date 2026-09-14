import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clearAllPkceStorage,
  createPkceStorage,
  PKCE_TTL_MS,
  pkceStoreSize,
  readPkceStorageSnapshot,
  removePkceStorage,
  resetPkceNowForTests,
  seedPkceStorageItem,
  setPkceNowForTests,
} from './pkceStorage.js';

describe('pkceStorage', () => {
  it('guarda y limpia por sessionId', () => {
    resetPkceNowForTests();
    clearAllPkceStorage();
    const store = createPkceStorage('sess-a');
    store.setItem('code_verifier', 'abc');
    assert.equal(store.getItem('code_verifier'), 'abc');
    removePkceStorage('sess-a');
    assert.equal(createPkceStorage('sess-a').getItem('code_verifier'), null);
  });

  it('expira entradas tras el TTL', () => {
    clearAllPkceStorage();
    let now = 1_000_000;
    setPkceNowForTests(() => now);
    try {
      const store = createPkceStorage('sess-ttl');
      store.setItem('code_verifier', 'xyz');
      assert.equal(pkceStoreSize(), 1);
      now = 1_000_000 + PKCE_TTL_MS + 1;
      assert.equal(createPkceStorage('sess-ttl').getItem('code_verifier'), null);
      assert.equal(pkceStoreSize(), 1); // nueva entrada vacía al recrear
    } finally {
      resetPkceNowForTests();
      clearAllPkceStorage();
    }
  });

  it('snapshot y seed restauran el verifier', () => {
    clearAllPkceStorage();
    const store = createPkceStorage('sess-seed');
    store.setItem('sb-x-auth-token-code-verifier', 'verifier-value');
    assert.deepEqual(readPkceStorageSnapshot('sess-seed'), {
      'sb-x-auth-token-code-verifier': 'verifier-value',
    });
    removePkceStorage('sess-seed');
    seedPkceStorageItem('sess-seed', 'sb-x-auth-token-code-verifier', 'verifier-value');
    assert.equal(
      createPkceStorage('sess-seed').getItem('sb-x-auth-token-code-verifier'),
      'verifier-value',
    );
    clearAllPkceStorage();
  });
});

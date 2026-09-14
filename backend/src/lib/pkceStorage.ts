type StorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type StoreEntry = {
  values: Map<string, string>;
  expiresAt: number;
};

/** TTL del verifier PKCE (OAuth Google). Evita Map infinito si el exchange nunca llega. */
export const PKCE_TTL_MS = 15 * 60 * 1000;

const stores = new Map<string, StoreEntry>();

let nowFn = () => Date.now();

/** Solo tests. */
export function setPkceNowForTests(fn: () => number) {
  nowFn = fn;
}

/** Solo tests. */
export function resetPkceNowForTests() {
  nowFn = () => Date.now();
}

function purgeExpired() {
  const now = nowFn();
  for (const [id, entry] of stores) {
    if (entry.expiresAt <= now) stores.delete(id);
  }
}

export function createPkceStorage(sessionId: string): StorageAdapter {
  purgeExpired();
  let entry = stores.get(sessionId);
  if (!entry) {
    entry = { values: new Map(), expiresAt: nowFn() + PKCE_TTL_MS };
    stores.set(sessionId, entry);
  }

  return {
    getItem: (key) => {
      purgeExpired();
      return stores.get(sessionId)?.values.get(key) ?? null;
    },
    setItem: (key, value) => {
      purgeExpired();
      let current = stores.get(sessionId);
      if (!current) {
        current = { values: new Map(), expiresAt: nowFn() + PKCE_TTL_MS };
        stores.set(sessionId, current);
      }
      current.values.set(key, value);
    },
    removeItem: (key) => {
      stores.get(sessionId)?.values.delete(key);
    },
  };
}

export function removePkceStorage(sessionId: string) {
  stores.delete(sessionId);
}

/** Snapshot de claves PKCE (p. ej. `…-code-verifier`) para devolverlas al cliente. */
export function readPkceStorageSnapshot(sessionId: string): Record<string, string> {
  purgeExpired();
  const entry = stores.get(sessionId);
  if (!entry) return {};
  return Object.fromEntries(entry.values);
}

/** Restaura una entrada PKCE concreta (exchange en otra instancia Railway). */
export function seedPkceStorageItem(sessionId: string, key: string, value: string) {
  const store = createPkceStorage(sessionId);
  store.setItem(key, value);
}

/** Solo tests. */
export function clearAllPkceStorage() {
  stores.clear();
}

/** Solo tests. */
export function pkceStoreSize() {
  return stores.size;
}

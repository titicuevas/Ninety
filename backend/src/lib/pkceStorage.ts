type StorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const stores = new Map<string, Map<string, string>>();

export function createPkceStorage(sessionId: string): StorageAdapter {
  let store = stores.get(sessionId);
  if (!store) {
    store = new Map<string, string>();
    stores.set(sessionId, store);
  }

  return {
    getItem: (key) => store!.get(key) ?? null,
    setItem: (key, value) => {
      store!.set(key, value);
    },
    removeItem: (key) => {
      store!.delete(key);
    },
  };
}

export function removePkceStorage(sessionId: string) {
  stores.delete(sessionId);
}

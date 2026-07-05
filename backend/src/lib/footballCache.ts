const CACHE_TTL_MS = 15 * 60 * 1000;

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs = CACHE_TTL_MS) {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearFootballCache() {
  store.clear();
}

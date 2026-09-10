/**
 * Race a thenable against a timeout (no cancela la promesa original).
 * Útil cuando el cliente Supabase no propaga AbortSignal en todas las queries.
 */
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label = 'Operación',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} agotó el tiempo de espera (${ms}ms)`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Fetch con AbortSignal.timeout para clientes HTTP (Supabase / apiFetch). */
export function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: RequestInit | undefined,
  ms: number,
): Promise<Response> {
  const timeout = AbortSignal.timeout(ms);
  const signal =
    init?.signal && typeof AbortSignal.any === 'function'
      ? AbortSignal.any([init.signal, timeout])
      : timeout;
  return fetch(input, { ...init, signal });
}

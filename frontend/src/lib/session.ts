import type { AuthSession } from '@/types/auth';

const SESSION_KEY = 'ninety.session:v1';
const LEGACY_SESSION_KEY = 'ninety.session';
const PKCE_KEY = 'ninety.pkce';

type PkceBundle = {
  pkceId: string;
  codeVerifierKey: string;
  codeVerifier: string;
};

export function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(SESSION_KEY) ?? localStorage.getItem(LEGACY_SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, raw);
      localStorage.removeItem(LEGACY_SESSION_KEY);
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
}

/** Guarda PKCE en session + local: el redirect de Google a veces pierde solo sessionStorage. */
export function savePkceBundle(bundle: PkceBundle) {
  const raw = JSON.stringify(bundle);
  sessionStorage.setItem(PKCE_KEY, raw);
  try {
    localStorage.setItem(PKCE_KEY, raw);
  } catch {
    /* private mode / quota */
  }
}

export function consumePkceBundle(): PkceBundle | null {
  const raw = sessionStorage.getItem(PKCE_KEY) ?? localStorage.getItem(PKCE_KEY);
  sessionStorage.removeItem(PKCE_KEY);
  localStorage.removeItem(PKCE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PkceBundle>;
    if (
      typeof parsed.pkceId === 'string' &&
      typeof parsed.codeVerifierKey === 'string' &&
      typeof parsed.codeVerifier === 'string'
    ) {
      return {
        pkceId: parsed.pkceId,
        codeVerifierKey: parsed.codeVerifierKey,
        codeVerifier: parsed.codeVerifier,
      };
    }
  } catch {
    /* valor legado: solo uuid */
  }
  return null;
}

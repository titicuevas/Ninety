const STORAGE_KEY = 'ninety.cookieNotice.v1';

export function readCookieNoticeAccepted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function acceptCookieNotice() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore quota */
  }
}

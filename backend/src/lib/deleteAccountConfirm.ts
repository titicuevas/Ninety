export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** El usuario debe escribir su email exacto para confirmar el borrado. */
export function isAccountDeleteEmailConfirmed(
  accountEmail: string | null | undefined,
  confirmEmail: string,
): boolean {
  const normalized = normalizeAccountEmail(confirmEmail);
  if (!normalized) return false;
  const account = normalizeAccountEmail(accountEmail ?? '');
  return !!account && account === normalized;
}

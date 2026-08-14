/** Sección Capsules del shell: diario, me gusta y calendario. */

export function isCapsulesSectionPath(pathname: string): boolean {
  return (
    pathname === '/capsules' ||
    pathname.startsWith('/capsules/') ||
    pathname === '/likes' ||
    pathname.startsWith('/likes/') ||
    pathname === '/diary/calendar' ||
    pathname.startsWith('/diary/calendar/')
  );
}

export function isLikesPath(pathname: string): boolean {
  return pathname === '/likes' || pathname.startsWith('/likes/');
}

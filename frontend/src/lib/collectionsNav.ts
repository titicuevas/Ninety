/** Rutas de la sección colecciones / listas en el shell autenticado. */

export function isCollectionsSectionPath(pathname: string): boolean {
  return (
    pathname === '/collections' ||
    pathname.startsWith('/collections/') ||
    pathname === '/want-to-go' ||
    pathname.startsWith('/want-to-go/')
  );
}

export function isCollectionsExplorePath(pathname: string): boolean {
  return (
    pathname === '/collections/explore' || pathname.startsWith('/collections/explore/')
  );
}

export function isCollectionsLikedPath(pathname: string): boolean {
  return pathname === '/collections/likes' || pathname.startsWith('/collections/likes/');
}

export function isWantToGoPath(pathname: string): boolean {
  return pathname === '/want-to-go' || pathname.startsWith('/want-to-go/');
}

/** Mis listas (índice + detalle propio), no descubrir, me gusta ni Quiero ir. */
export function isCollectionsMinePath(pathname: string): boolean {
  return (
    isCollectionsSectionPath(pathname) &&
    !isCollectionsExplorePath(pathname) &&
    !isCollectionsLikedPath(pathname) &&
    !isWantToGoPath(pathname)
  );
}

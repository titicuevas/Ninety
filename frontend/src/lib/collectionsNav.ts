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

export function isWantToGoPath(pathname: string): boolean {
  return pathname === '/want-to-go' || pathname.startsWith('/want-to-go/');
}

/** Mis listas (índice + detalle propio), no descubrir ni Quiero ir. */
export function isCollectionsMinePath(pathname: string): boolean {
  return (
    isCollectionsSectionPath(pathname) &&
    !isCollectionsExplorePath(pathname) &&
    !isWantToGoPath(pathname)
  );
}

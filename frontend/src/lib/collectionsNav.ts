/** Rutas de la sección colecciones en el shell autenticado. */

export function isCollectionsSectionPath(pathname: string): boolean {
  return pathname === '/collections' || pathname.startsWith('/collections/');
}

export function isCollectionsExplorePath(pathname: string): boolean {
  return (
    pathname === '/collections/explore' || pathname.startsWith('/collections/explore/')
  );
}

/** Mis listas (índice + detalle propio), no descubrir. */
export function isCollectionsMinePath(pathname: string): boolean {
  return isCollectionsSectionPath(pathname) && !isCollectionsExplorePath(pathname);
}

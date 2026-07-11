export function profilePath(username: string) {
  return `/u/${encodeURIComponent(username)}`;
}

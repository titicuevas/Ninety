/** Etiqueta visible del toggle seguir / dejar de seguir. */
export function followButtonLabel(options: {
  followed: boolean;
  /** true mientras corre POST (seguir). */
  following?: boolean;
  /** true mientras corre DELETE (dejar de seguir). */
  unfollowing?: boolean;
}): string {
  if (options.unfollowing) return 'Dejando de seguir';
  if (options.following) return 'Siguiendo…';
  if (options.followed) return 'Dejar de seguir';
  return 'Seguir';
}

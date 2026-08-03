/** Reordenar Capsules en una colección (espejo del helper backend). */

/** Intercambia una Capsule con la vecina (arriba/abajo). `null` si no se puede mover. */
export function moveCapsuleInOrder(
  orderedIds: string[],
  capsuleId: string,
  direction: 'up' | 'down',
): string[] | null {
  const index = orderedIds.indexOf(capsuleId);
  if (index < 0) return null;
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= orderedIds.length) return null;
  const next = [...orderedIds];
  const a = next[index]!;
  const b = next[swapWith]!;
  next[index] = b;
  next[swapWith] = a;
  return next;
}

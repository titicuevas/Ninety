/** Validación pura del reorder de Capsules en una colección (columna `position`). */

export type CollectionReorderOk = {
  ok: true;
  positions: { capsule_id: string; position: number }[];
};

export type CollectionReorderErr = {
  ok: false;
  error: string;
};

export type CollectionReorderResult = CollectionReorderOk | CollectionReorderErr;

/**
 * Comprueba que `orderedIds` sea exactamente el mismo conjunto que `currentIds`
 * (sin duplicados ni extras) y asigna posiciones 0..n-1.
 */
export function buildCollectionReorder(
  currentIds: string[],
  orderedIds: string[],
): CollectionReorderResult {
  if (orderedIds.length === 0) {
    return { ok: false, error: 'La lista de Capsules no puede estar vacía' };
  }

  if (orderedIds.length !== currentIds.length) {
    return {
      ok: false,
      error: 'La lista debe incluir exactamente las Capsules de la colección',
    };
  }

  const currentSet = new Set(currentIds);
  const seen = new Set<string>();

  for (const id of orderedIds) {
    if (!currentSet.has(id)) {
      return { ok: false, error: 'Hay Capsules que no pertenecen a la colección' };
    }
    if (seen.has(id)) {
      return { ok: false, error: 'Hay Capsules duplicadas en el orden' };
    }
    seen.add(id);
  }

  if (seen.size !== currentSet.size) {
    return { ok: false, error: 'Faltan Capsules de la colección' };
  }

  return {
    ok: true,
    positions: orderedIds.map((capsule_id, position) => ({ capsule_id, position })),
  };
}

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

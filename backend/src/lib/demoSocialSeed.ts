/** Marcador en comentarios sembrados — idempotente al re-ejecutar seed:fans. */
export const DEMO_SOCIAL_COMMENT_MARKER = 'ninety-seed';

export type DemoSocialKind =
  | 'capsule_like'
  | 'capsule_comment'
  | 'collection_like'
  | 'collection_comment';

export type DemoSocialAction = {
  actorIndex: number;
  targetIndex: number;
  kind: DemoSocialKind;
};

/** Listas que dejan los e2e en el perfil público si no se borran. */
export function isE2eLeftoverCollectionName(name: string): boolean {
  return /^E2E(\s|$)/i.test(name.trim());
}

/** Reseñas que dejan los e2e en el perfil público si no se restauran o borran. */
export function isE2eLeftoverNote(note: string | null | undefined): boolean {
  return /^(Guardado E2E \d+|E2E fotos \d+|Test E2E\b)/i.test((note ?? '').trim());
}

/** Capsules creadas por e2e (no son partidos del seed demo): se pueden borrar. */
export function isE2eCreatedCapsuleNote(note: string | null | undefined): boolean {
  return /^(E2E fotos \d+|Test E2E\b)/i.test((note ?? '').trim());
}

/**
 * El demo sigue a los 6 primeros fans: likes/comentarios entre ellos
 * salen en /activity y en «también le gusta / comentaron».
 */
export function demoFollowedSocialActions(): DemoSocialAction[] {
  return [
    { actorIndex: 1, targetIndex: 0, kind: 'capsule_comment' },
    { actorIndex: 2, targetIndex: 0, kind: 'capsule_like' },
    { actorIndex: 3, targetIndex: 1, kind: 'capsule_comment' },
    { actorIndex: 4, targetIndex: 1, kind: 'capsule_like' },
    { actorIndex: 5, targetIndex: 0, kind: 'collection_comment' },
    { actorIndex: 2, targetIndex: 0, kind: 'collection_like' },
  ];
}

export function demoSeedCommentBody(kind: 'capsule' | 'collection'): string {
  return kind === 'capsule'
    ? `Qué partidazo. ${DEMO_SOCIAL_COMMENT_MARKER}`
    : `Lista redonda. ${DEMO_SOCIAL_COMMENT_MARKER}`;
}

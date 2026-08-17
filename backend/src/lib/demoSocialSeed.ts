/** Marcador en comentarios sembrados — idempotente al re-ejecutar seed:fans. */
export const DEMO_SOCIAL_COMMENT_MARKER = 'ninety-seed';

/** Lista destacada del perfil demo (seed:fans). */
export const DEMO_FEATURED_COLLECTION_SLUG = 'favoritos-seed';
export const DEMO_FEATURED_COLLECTION_NAME = 'Favoritos';

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

/** Clave estable para reseñas canónicas del perfil demo (home|away). */
export function demoShowcaseNoteKey(homeTeam: string, awayTeam: string): string {
  return `${homeTeam.trim()}|${awayTeam.trim()}`;
}

/** Reseñas del diario demo — se restauran tras limpiar «Guardado E2E …». */
export const DEMO_SHOWCASE_NOTES: Readonly<Record<string, string>> = {
  [demoShowcaseNoteKey('AFC Bournemouth', 'Liverpool FC')]:
    'Premier League en Vitality. El Salah de siempre cerró el partido.',
  [demoShowcaseNoteKey('Liverpool FC', 'Manchester City FC')]:
    'Partidazo en Anfield. Salah y Haaland en estado de gracia.',
  [demoShowcaseNoteKey('Spain', 'France')]:
    'Selección sólida en defensa. Oyarzabal cerró el partido.',
  [demoShowcaseNoteKey('Real Madrid CF', 'FC Barcelona')]:
    'Clásico intenso. Vinicius decidió en el minuto 90.',
  [demoShowcaseNoteKey('Real Betis', 'Sevilla FC')]:
    'Derbi sevillano en el Villamarín. Ambiente espectacular.',
};

export function demoShowcaseNote(homeTeam: string, awayTeam: string): string | null {
  return DEMO_SHOWCASE_NOTES[demoShowcaseNoteKey(homeTeam, awayTeam)] ?? null;
}

/** Reseña vacía o residual E2E que puede sustituirse por la canónica del demo. */
export function needsDemoShowcaseNoteRestore(note: string | null | undefined): boolean {
  const trimmed = (note ?? '').trim();
  return trimmed.length === 0 || isE2eLeftoverNote(note);
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

export type DemoFeaturedSocialAction = {
  actorIndex: number;
  kind: 'collection_like' | 'collection_comment';
};

/** Likes/comentarios en la lista Favoritos del demo (fans que @beta_ninety sigue). */
export function demoFeaturedSocialActions(): DemoFeaturedSocialAction[] {
  return [
    { actorIndex: 2, kind: 'collection_like' },
    { actorIndex: 5, kind: 'collection_comment' },
  ];
}

export type DemoCapsuleSocialAction = {
  actorIndex: number;
  kind: 'capsule_like' | 'capsule_comment';
};

/** Likes/comentarios en una Capsule pública del demo (mismo círculo de follows). */
export function demoCapsuleSocialActions(): DemoCapsuleSocialAction[] {
  return [
    { actorIndex: 1, kind: 'capsule_comment' },
    { actorIndex: 2, kind: 'capsule_like' },
  ];
}

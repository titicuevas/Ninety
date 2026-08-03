/** Copy de carga futbolero — tono beta ES, sin exagerar. */
export const NINETY_LOADING_PHRASES = [
  'Calentando…',
  'Puliendo el césped…',
  'Revisando el VAR…',
  'Alineando el once…',
  'Preparando el diario…',
] as const;

export type NinetyLoadingPhrase = (typeof NINETY_LOADING_PHRASES)[number];

export function pickLoadingPhrase(index = 0): NinetyLoadingPhrase {
  const i = ((index % NINETY_LOADING_PHRASES.length) + NINETY_LOADING_PHRASES.length) % NINETY_LOADING_PHRASES.length;
  return NINETY_LOADING_PHRASES[i]!;
}

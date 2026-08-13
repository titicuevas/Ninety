export type ShareLinkResult = 'shared' | 'copied' | 'aborted' | 'manual_needed';

type ShareLinkOptions = {
  title: string;
  /** URL para Web Share (opcional si solo compartes texto). */
  url?: string;
  /** Texto distinto del título (evita duplicar en Web Share). */
  text?: string;
  /**
   * Qué escribir en el clipboard si no hay Web Share.
   * Por defecto: `url`. Obligatorio si no hay `url`.
   */
  clipboardText?: string;
};

/** Copia texto al portapapeles (one-tap). */
export async function copyTextToClipboard(text: string): Promise<'copied' | 'manual_needed'> {
  const value = text.trim();
  if (!value) return 'manual_needed';
  try {
    await navigator.clipboard.writeText(value);
    return 'copied';
  } catch {
    return 'manual_needed';
  }
}

/**
 * Intenta Web Share → clipboard → indica que hay que mostrar el contenido a mano.
 */
export async function shareOrCopyLink({
  url,
  title,
  text,
  clipboardText,
}: ShareLinkOptions): Promise<ShareLinkResult> {
  const toCopy = clipboardText ?? url;
  if (!toCopy) return 'manual_needed';

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({
        title,
        ...(url ? { url } : {}),
        ...(text ? { text } : {}),
      });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'aborted';
  }

  const copied = await copyTextToClipboard(toCopy);
  return copied === 'copied' ? 'copied' : 'manual_needed';
}

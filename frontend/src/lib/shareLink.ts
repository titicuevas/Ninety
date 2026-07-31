export type ShareLinkResult = 'shared' | 'copied' | 'aborted' | 'manual_needed';

type ShareLinkOptions = {
  url: string;
  title: string;
  /** Texto distinto del título (evita duplicar en Web Share). */
  text?: string;
};

/**
 * Intenta Web Share → clipboard → indica que hay que mostrar la URL a mano.
 */
export async function shareOrCopyLink({
  url,
  title,
  text,
}: ShareLinkOptions): Promise<ShareLinkResult> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({
        title,
        url,
        ...(text ? { text } : {}),
      });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'aborted';
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'manual_needed';
  }
}

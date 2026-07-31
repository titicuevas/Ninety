import { isWatchContext, type WatchContext } from '@/lib/watchContext';

const DRAFT_MEMORY_KEY = 'ninety.draftCapsuleMemory';

export type CapsuleMemoryDraft = {
  matchId: number;
  watched_at: string;
  note: string;
  rating: number | null;
  is_public: boolean;
  watch_context: WatchContext | null;
};

function isMemoryDraft(value: unknown): value is CapsuleMemoryDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as CapsuleMemoryDraft;
  return (
    typeof draft.matchId === 'number' &&
    Number.isFinite(draft.matchId) &&
    typeof draft.watched_at === 'string' &&
    typeof draft.note === 'string' &&
    (draft.rating === null || (typeof draft.rating === 'number' && draft.rating >= 1 && draft.rating <= 5)) &&
    typeof draft.is_public === 'boolean' &&
    (draft.watch_context === null || isWatchContext(draft.watch_context))
  );
}

export function saveDraftCapsuleMemory(draft: CapsuleMemoryDraft): void {
  try {
    sessionStorage.setItem(DRAFT_MEMORY_KEY, JSON.stringify(draft));
  } catch {
    /* storage lleno o bloqueado */
  }
}

export function readDraftCapsuleMemory(matchId: number): CapsuleMemoryDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_MEMORY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isMemoryDraft(parsed) || parsed.matchId !== matchId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraftCapsuleMemory(): void {
  try {
    sessionStorage.removeItem(DRAFT_MEMORY_KEY);
  } catch {
    /* ignore */
  }
}

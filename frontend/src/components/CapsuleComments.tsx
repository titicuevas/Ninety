import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  useAddCapsuleComment,
  useCapsuleComments,
  useDeleteCapsuleComment,
} from '@/hooks/useCapsuleComments';
import { formatRelativeTime } from '@/lib/format';
import { profilePath } from '@/lib/profilePath';
import { cn } from '@/lib/utils';
import type { CapsuleComment } from '@/types/comment';

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  deleting,
}: {
  comment: CapsuleComment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const name = comment.author?.display_name ?? comment.author?.username ?? 'Aficionado';
  const username = comment.author?.username;
  const isOwn = comment.user_id === currentUserId;

  return (
    <div className="flex gap-2 text-sm">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
        {name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {username && !isOwn ? (
            <Link to={profilePath(username)} className="font-medium text-primary hover:underline">
              {name}
            </Link>
          ) : (
            <span className="font-medium">{isOwn ? `${name} (tú)` : name}</span>
          )}
          <time className="text-xs text-muted-foreground" dateTime={comment.created_at}>
            {formatRelativeTime(comment.created_at)}
          </time>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">{comment.body}</p>
      </div>
      {isOwn ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
          aria-label="Borrar comentario"
          disabled={deleting}
          onClick={() => onDelete(comment.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

interface CapsuleCommentsProps {
  capsuleId: string;
  commentsCount?: number;
  currentUserId?: string;
  className?: string;
}

export function CapsuleComments({
  capsuleId,
  commentsCount = 0,
  currentUserId,
  className,
}: CapsuleCommentsProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { data, isLoading, isError } = useCapsuleComments(capsuleId, open);
  const addComment = useAddCapsuleComment(capsuleId);
  const deleteComment = useDeleteCapsuleComment(capsuleId);

  const comments = data?.comments ?? [];
  const label = commentsCount > 0 ? `${commentsCount} comentarios` : 'Comentar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    try {
      await addComment.mutateAsync(text);
      setDraft('');
    } catch {
      // error shown via mutation state if needed
    }
  };

  return (
    <div className={cn(className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
          'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          open ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{open ? 'Ocultar comentarios' : label}</span>
      </button>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {currentUserId ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe un comentario…"
                maxLength={500}
                rows={2}
                className="min-h-[72px] resize-none text-sm"
                aria-label="Nuevo comentario"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {draft.length}/500 · Sé respetuoso
                </span>
                <Button type="submit" size="sm" loading={addComment.isPending} disabled={!draft.trim()}>
                  Publicar
                </Button>
              </div>
              {addComment.error ? (
                <p className="text-xs text-destructive">{(addComment.error as Error).message}</p>
              ) : null}
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                Inicia sesión
              </Link>{' '}
              para comentar.
            </p>
          )}

          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : null}

          {isError ? (
            <p className="text-xs text-destructive">No se pudieron cargar los comentarios.</p>
          ) : null}

          {!isLoading && comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id}>
                  <CommentItem
                    comment={comment}
                    currentUserId={currentUserId}
                    onDelete={(id) => deleteComment.mutate(id)}
                    deleting={deleteComment.isPending}
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {!isLoading && !isError && comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sé el primero en comentar.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

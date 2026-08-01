import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useAddCapsuleComment,
  useCapsuleComments,
  useDeleteCapsuleComment,
  useUpdateCapsuleComment,
} from '@/hooks/useCapsuleComments';
import { formatRelativeTime } from '@/lib/format';
import { profilePath } from '@/lib/profilePath';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { CapsuleComment } from '@/types/comment';

function CommentAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null | undefined }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  capsuleOwnerId,
  onDelete,
  deleting,
  onSaveEdit,
  editingBusy,
}: {
  comment: CapsuleComment;
  currentUserId?: string;
  capsuleOwnerId?: string;
  onDelete: (id: string) => void;
  deleting: boolean;
  onSaveEdit: (id: string, body: string) => Promise<void>;
  editingBusy: boolean;
}) {
  const name = comment.author?.display_name ?? comment.author?.username ?? 'Aficionado';
  const username = comment.author?.username;
  const isOwn = comment.user_id === currentUserId;
  const canDelete =
    !!currentUserId && (isOwn || (!!capsuleOwnerId && currentUserId === capsuleOwnerId));
  const deleteLabel =
    isOwn || !capsuleOwnerId || currentUserId !== capsuleOwnerId
      ? 'Borrar comentario'
      : 'Eliminar comentario (moderación)';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(comment.body);
  }, [comment.body, editing]);

  const saveEdit = async () => {
    const text = draft.trim();
    if (!text || text === comment.body) {
      setEditing(false);
      return;
    }
    setEditError(null);
    try {
      await onSaveEdit(comment.id, text);
      setEditing(false);
      toast.success('Comentario actualizado');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'No se pudo editar');
    }
  };

  return (
    <div className="flex gap-2 text-sm">
      <CommentAvatar name={name} avatarUrl={comment.author?.avatar_url} />
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
        {editing ? (
          <div className="mt-1.5 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              rows={2}
              className="min-h-[64px] resize-none text-sm"
              aria-label="Editar comentario"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                loading={editingBusy}
                disabled={!draft.trim()}
                onClick={() => void saveEdit()}
              >
                Guardar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={editingBusy}
                onClick={() => {
                  setEditing(false);
                  setDraft(comment.body);
                  setEditError(null);
                }}
              >
                Cancelar
              </Button>
            </div>
            {editError ? <p className="text-xs text-destructive">{editError}</p> : null}
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">{comment.body}</p>
        )}
      </div>
      {!editing && (isOwn || canDelete) ? (
        <div className="flex shrink-0 gap-0.5">
          {isOwn ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Editar comentario"
              disabled={deleting || editingBusy}
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              aria-label={deleteLabel}
              disabled={deleting || editingBusy}
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface CapsuleCommentsProps {
  capsuleId: string;
  commentsCount?: number;
  currentUserId?: string;
  capsuleOwnerId?: string;
  /** Abrir el panel al montar (p.ej. deep link `#comments`). */
  defaultOpen?: boolean;
  className?: string;
}

export function CapsuleComments({
  capsuleId,
  commentsCount = 0,
  currentUserId,
  capsuleOwnerId,
  defaultOpen = false,
  className,
}: CapsuleCommentsProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data, isLoading, isError } = useCapsuleComments(capsuleId, open);
  const addComment = useAddCapsuleComment(capsuleId);
  const deleteComment = useDeleteCapsuleComment(capsuleId);
  const updateComment = useUpdateCapsuleComment(capsuleId);

  const comments = data?.comments ?? [];
  const label = commentsCount > 0 ? `${commentsCount} comentarios` : 'Comentar';
  const panelId = `comments-panel-${capsuleId}`;

  useEffect(() => {
    if (!defaultOpen) return;
    const id = window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [defaultOpen]);

  useEffect(() => {
    if (!open || !currentUserId) return;
    const id = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, currentUserId]);

  const handleToggle = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (!next && window.location.hash === '#comments') {
        const path = `${window.location.pathname}${window.location.search}`;
        window.history.replaceState(null, '', path);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    try {
      await addComment.mutateAsync(text);
      setDraft('');
      toast.success('Comentario publicado');
    } catch {
      // error shown via mutation state if needed
    }
  };

  return (
    <div id="comments" ref={panelRef} className={cn(className)}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={panelId}
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
        <div id={panelId} className="motion-reveal mt-3 space-y-3 border-t border-border pt-3">
          {currentUserId ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2">
              <Textarea
                ref={textareaRef}
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
            <div className="space-y-3" role="status" aria-label="Cargando comentarios">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
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
                    capsuleOwnerId={capsuleOwnerId}
                    onDelete={(id) => setPendingDeleteId(id)}
                    deleting={deleteComment.isPending && pendingDeleteId === comment.id}
                    editingBusy={updateComment.isPending && editingId === comment.id}
                    onSaveEdit={async (id, body) => {
                      setEditingId(id);
                      try {
                        await updateComment.mutateAsync({ commentId: id, body });
                      } finally {
                        setEditingId(null);
                      }
                    }}
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

      <ConfirmDialog
        open={pendingDeleteId != null}
        title="¿Borrar este comentario?"
        description="No se puede deshacer."
        confirmLabel="Borrar"
        busy={deleteComment.isPending}
        onConfirm={() => {
          if (!pendingDeleteId) return;
          deleteComment.mutate(pendingDeleteId, {
            onSettled: () => setPendingDeleteId(null),
          });
        }}
        onCancel={() => {
          if (!deleteComment.isPending) setPendingDeleteId(null);
        }}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import {
  useAddCollectionComment,
  useCollectionComments,
  useDeleteCollectionComment,
  useUpdateCollectionComment,
} from '@/hooks/useCollectionComments';
import { useAuthReturnLinks } from '@/hooks/useAuthReturnLinks';
import { splitCommentMentions } from '@/lib/commentMentions';
import { formatRelativeTime } from '@/lib/format';
import { isAutoUsername } from '@/lib/profileHelpers';
import { publicProfilePath } from '@/lib/profilePath';
import { toast } from '@/lib/toast';
import type { CollectionComment } from '@/types/collectionComment';

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

function CommentBodyText({ body }: { body: string }) {
  const parts = splitCommentMentions(body);
  return (
    <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.value}</span>;
        }
        const href = publicProfilePath(part.username);
        if (!href) {
          return <span key={index}>@{part.raw}</span>;
        }
        return (
          <Link key={index} to={href} className="font-medium text-primary hover:underline">
            @{part.raw}
          </Link>
        );
      })}
    </p>
  );
}

function CommentItem({
  comment,
  currentUserId,
  collectionOwnerId,
  onDelete,
  deleting,
  onSaveEdit,
  editingBusy,
}: {
  comment: CollectionComment;
  currentUserId?: string;
  collectionOwnerId?: string;
  onDelete: (id: string) => void;
  deleting: boolean;
  onSaveEdit: (id: string, body: string) => Promise<void>;
  editingBusy: boolean;
}) {
  const name = comment.author?.display_name ?? comment.author?.username ?? 'Aficionado';
  const username = comment.author?.username;
  const isOwn = comment.user_id === currentUserId;
  const canDelete =
    !!currentUserId && (isOwn || (!!collectionOwnerId && currentUserId === collectionOwnerId));
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
          {username && !isOwn && !isAutoUsername(username) ? (
            <Link to={publicProfilePath(username)!} className="font-medium text-primary hover:underline">
              {name}
            </Link>
          ) : (
            <span className="font-medium">{isOwn ? `${name} (tú)` : name}</span>
          )}
          <time className="text-xs text-muted-foreground" dateTime={comment.created_at}>
            {formatRelativeTime(comment.created_at)}
          </time>
          {comment.edited_at ? (
            <span className="text-xs text-muted-foreground" title={comment.edited_at}>
              · editado
            </span>
          ) : null}
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
          <CommentBodyText body={comment.body} />
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
              aria-label="Borrar comentario"
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

interface CollectionCommentsProps {
  collectionId: string;
  currentUserId?: string;
  collectionOwnerId?: string;
  className?: string;
}

export function CollectionComments({
  collectionId,
  currentUserId,
  collectionOwnerId,
  className,
}: CollectionCommentsProps) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data, isLoading, isError, error, refetch, isRefetching } = useCollectionComments(
    collectionId,
    open,
  );
  const addComment = useAddCollectionComment(collectionId);
  const deleteComment = useDeleteCollectionComment(collectionId);
  const updateComment = useUpdateCollectionComment(collectionId);
  const { loginTo } = useAuthReturnLinks();

  const comments = data?.comments ?? [];
  const label = comments.length > 0 ? `${comments.length} comentarios` : 'Comentar';

  useEffect(() => {
    if (!open || !currentUserId) return;
    const id = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, currentUserId]);

  const publish = () => {
    const body = draft.trim();
    if (!body || addComment.isPending) return;
    addComment.mutate(body, {
      onSuccess: () => {
        setDraft('');
        toast.success('Comentario publicado');
      },
    });
  };

  return (
    <section className={className} aria-label="Comentarios de la colección">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
        {open ? 'Ocultar comentarios' : label}
      </button>

      {open ? (
        <div className="mt-4 space-y-4">
          {currentUserId ? (
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                rows={2}
                className="min-h-[64px] resize-none text-sm"
                aria-label="Nuevo comentario"
                placeholder="Escribe un comentario…"
              />
              <Button
                type="button"
                size="sm"
                loading={addComment.isPending}
                disabled={!draft.trim()}
                onClick={publish}
              >
                Publicar
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link to={loginTo} className="text-primary hover:underline">
                Inicia sesión
              </Link>{' '}
              para comentar esta lista.
            </p>
          )}

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : null}

          {isError ? (
            <QueryErrorCard
              message={error instanceof Error ? error.message : 'No se pudieron cargar comentarios'}
              loading={isRefetching}
              onRetry={() => void refetch()}
            />
          ) : null}

          {!isLoading && !isError && comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sé el primero en comentar esta lista.</p>
          ) : null}

          {!isLoading && !isError && comments.length > 0 ? (
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment.id}>
                  <CommentItem
                    comment={comment}
                    currentUserId={currentUserId}
                    collectionOwnerId={collectionOwnerId}
                    deleting={deleteComment.isPending && pendingDeleteId === comment.id}
                    editingBusy={updateComment.isPending && editingId === comment.id}
                    onDelete={(id) => setPendingDeleteId(id)}
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
        </div>
      ) : null}

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="¿Borrar este comentario?"
        description="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        busy={deleteComment.isPending}
        onConfirm={() => {
          const id = pendingDeleteId;
          if (!id) return;
          deleteComment.mutate(id, {
            onSettled: () => setPendingDeleteId(null),
          });
        }}
        onCancel={() => {
          if (!deleteComment.isPending) setPendingDeleteId(null);
        }}
      />
    </section>
  );
}

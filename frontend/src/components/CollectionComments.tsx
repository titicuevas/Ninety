import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Pencil, Reply, Trash2 } from 'lucide-react';
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
import { buildCommentThreads } from '@/types/comment';
import type { CollectionComment } from '@/types/collectionComment';

const NO_COMMENTS: CollectionComment[] = [];

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
      {parts.map((part) => {
        if (part.type === 'text') {
          return <span key={part.start}>{part.value}</span>;
        }
        const href = publicProfilePath(part.username);
        if (!href) {
          return <span key={part.start}>@{part.raw}</span>;
        }
        return (
          <Link key={part.start} to={href} className="font-medium text-primary hover:underline">
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
  canReply,
  onReply,
  replyOpen,
}: {
  comment: CollectionComment;
  currentUserId?: string;
  collectionOwnerId?: string;
  onDelete: (id: string) => void;
  deleting: boolean;
  onSaveEdit: (id: string, body: string) => Promise<void>;
  editingBusy: boolean;
  canReply?: boolean;
  onReply?: () => void;
  replyOpen?: boolean;
}) {
  const name = comment.author?.display_name ?? comment.author?.username ?? 'Aficionado';
  const username = comment.author?.username;
  const isOwn = comment.user_id === currentUserId;
  const canDelete =
    !!currentUserId && (isOwn || (!!collectionOwnerId && currentUserId === collectionOwnerId));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [editError, setEditError] = useState<string | null>(null);

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
        {!editing && canReply && currentUserId && onReply ? (
          <button
            type="button"
            onClick={onReply}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
            aria-expanded={replyOpen}
          >
            <Reply className="h-3 w-3" aria-hidden="true" />
            {replyOpen ? 'Cancelar' : 'Responder'}
          </button>
        ) : null}
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
              onClick={() => {
                setDraft(comment.body);
                setEditError(null);
                setEditing(true);
              }}
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
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { data, isLoading, isError, error, refetch, isRefetching } = useCollectionComments(
    collectionId,
    open,
  );
  const addComment = useAddCollectionComment(collectionId);
  const deleteComment = useDeleteCollectionComment(collectionId);
  const updateComment = useUpdateCollectionComment(collectionId);
  const { loginTo } = useAuthReturnLinks();

  const comments = data?.comments ?? NO_COMMENTS;
  const threads = useMemo(() => buildCommentThreads(comments), [comments]);
  const label = comments.length > 0 ? `${comments.length} comentarios` : 'Comentar';

  useEffect(() => {
    if (!open || !currentUserId) return;
    const id = window.requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, currentUserId]);

  useEffect(() => {
    if (!replyToId) return;
    const id = window.requestAnimationFrame(() => {
      replyTextareaRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [replyToId]);

  const publish = () => {
    const body = draft.trim();
    if (!body || addComment.isPending) return;
    addComment.mutate(
      { body },
      {
        onSuccess: () => {
          setDraft('');
          toast.success('Comentario publicado');
        },
      },
    );
  };

  const publishReply = () => {
    const body = replyDraft.trim();
    if (!body || !replyToId || addComment.isPending) return;
    addComment.mutate(
      { body, parentId: replyToId },
      {
        onSuccess: () => {
          setReplyDraft('');
          setReplyToId(null);
          toast.success('Respuesta publicada');
        },
      },
    );
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
                loading={addComment.isPending && !replyToId}
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

          {!isLoading && !isError && threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sé el primero en comentar esta lista.</p>
          ) : null}

          {!isLoading && !isError && threads.length > 0 ? (
            <ul className="space-y-4">
              {threads.map(({ root, replies }) => (
                <li key={root.id} className="space-y-2">
                  <CommentItem
                    comment={root}
                    currentUserId={currentUserId}
                    collectionOwnerId={collectionOwnerId}
                    deleting={deleteComment.isPending && pendingDeleteId === root.id}
                    editingBusy={updateComment.isPending && editingId === root.id}
                    canReply={!!currentUserId}
                    replyOpen={replyToId === root.id}
                    onReply={() => {
                      setReplyToId((prev) => (prev === root.id ? null : root.id));
                      setReplyDraft('');
                    }}
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
                  {replyToId === root.id && currentUserId ? (
                    <div className="ml-9 space-y-2 border-l border-border pl-3">
                      <Textarea
                        ref={replyTextareaRef}
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder="Escribe una respuesta…"
                        maxLength={500}
                        rows={2}
                        className="min-h-[64px] resize-none text-sm"
                        aria-label="Nueva respuesta"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          loading={addComment.isPending && !!replyToId}
                          disabled={!replyDraft.trim()}
                          onClick={publishReply}
                        >
                          Responder
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={addComment.isPending}
                          onClick={() => {
                            setReplyToId(null);
                            setReplyDraft('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {replies.length > 0 ? (
                    <ul className="ml-9 space-y-3 border-l border-border pl-3">
                      {replies.map((reply) => (
                        <li key={reply.id}>
                          <CommentItem
                            comment={reply}
                            currentUserId={currentUserId}
                            collectionOwnerId={collectionOwnerId}
                            deleting={deleteComment.isPending && pendingDeleteId === reply.id}
                            editingBusy={updateComment.isPending && editingId === reply.id}
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
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="¿Borrar este comentario?"
        description="Si tiene respuestas, también se eliminarán. Esta acción no se puede deshacer."
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

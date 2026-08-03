import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, Library, Plus } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  useAddCapsuleToCollection,
  useCollectionMemberships,
  useCreateCollection,
  useMyCollections,
  useRemoveCapsuleFromCollection,
} from '@/hooks/useCollections';
import { ApiError } from '@/lib/api';
import { slugifyCollectionName } from '@/lib/collectionSlug';
import { cn } from '@/lib/utils';

type AddToCollectionButtonProps = {
  capsuleId: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'secondary' | 'ghost';
  className?: string;
};

export function AddToCollectionButton({
  capsuleId,
  size = 'sm',
  variant = 'outline',
  className,
}: AddToCollectionButtonProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const { data, isLoading, isError, error, refetch, isRefetching } = useMyCollections();
  const memberships = useCollectionMemberships(capsuleId, open);
  const addToCollection = useAddCapsuleToCollection();
  const removeFromCollection = useRemoveCapsuleFromCollection();
  const createCollection = useCreateCollection();

  const collections = data?.collections ?? [];
  const memberSet = new Set(memberships.data?.collection_ids ?? []);
  const busy = addToCollection.isPending || removeFromCollection.isPending || createCollection.isPending;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  /** Esc / backdrop / Cerrar siempre pueden salir — busy no debe atrapar el modal. */
  const close = () => {
    setOpen(false);
    setCreating(false);
    setNewName('');
    setPendingId(null);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onNativeClose = () => {
      setOpen(false);
      setCreating(false);
      setNewName('');
      setPendingId(null);
    };
    dialog.addEventListener('close', onNativeClose);
    return () => dialog.removeEventListener('close', onNativeClose);
  }, []);

  const toggleMembership = (collectionId: string) => {
    setPendingId(collectionId);
    if (memberSet.has(collectionId)) {
      removeFromCollection.mutate(
        { collectionId, capsuleId },
        { onSettled: () => setPendingId(null) },
      );
      return;
    }
    addToCollection.mutate(
      { collectionId, capsuleId },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            void memberships.refetch();
          }
        },
        onSettled: () => setPendingId(null),
      },
    );
  };

  const onCreateAndAdd = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    createCollection.mutate(
      {
        name: trimmed,
        is_public: true,
        slug: slugifyCollectionName(trimmed),
      },
      {
        onSuccess: (result) => {
          setNewName('');
          setCreating(false);
          addToCollection.mutate({ collectionId: result.collection.id, capsuleId });
        },
      },
    );
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Library className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Añadir a colección
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className={cn(
          'fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent p-4 text-card-foreground',
          'backdrop:bg-black/60 open:flex',
        )}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div
          className="flex max-h-[min(85dvh,32rem)] w-[min(100%,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <h2 id={titleId} className="text-base font-semibold tracking-tight">
              Añadir a colección
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              Cerrar
            </Button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
            {isLoading || (open && memberships.isLoading) ? (
              <p className="py-6 text-sm text-muted-foreground">Cargando colecciones…</p>
            ) : null}

            {isError ? (
              <QueryErrorCard
                className="my-3"
                message={error instanceof Error ? error.message : 'No se pudieron cargar las colecciones'}
                loading={isRefetching}
                onRetry={() => void refetch()}
              />
            ) : null}

            {!isLoading && !isError && collections.length === 0 && !creating ? (
              <EmptyState
                icon={Library}
                className="border-0 py-8"
                title="Sin colecciones aún"
                description="Crea una lista (Clásicos, Viajes…) y guarda este partido."
              >
                <Button type="button" size="sm" onClick={() => setCreating(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Crear colección
                </Button>
              </EmptyState>
            ) : null}

            {!isLoading && !isError && collections.length > 0 ? (
              <ul className="divide-y divide-border">
                {collections.map((collection) => {
                  const inList = memberSet.has(collection.id);
                  const rowBusy = pendingId === collection.id && busy;
                  return (
                    <li key={collection.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleMembership(collection.id)}
                        className={cn(
                          'flex w-full items-center gap-3 py-3 text-left transition-colors',
                          'hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          rowBusy && 'opacity-70',
                        )}
                        aria-pressed={inList}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                            inList
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border text-muted-foreground',
                          )}
                          aria-hidden
                        >
                          {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{collection.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {collection.items_count ?? 0}{' '}
                            {(collection.items_count ?? 0) === 1 ? 'partido' : 'partidos'}
                            {inList ? ' · en la lista' : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {creating ? (
              <form onSubmit={onCreateAndAdd} className="mt-3 space-y-3 border-t border-border pt-3">
                <FormField label="Nombre de la colección">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Clásicos"
                    maxLength={80}
                    required
                    autoFocus
                  />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" loading={createCollection.isPending}>
                    Crear y añadir
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={createCollection.isPending}
                    onClick={() => {
                      setCreating(false);
                      setNewName('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : null}

            {!creating && collections.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                <Button type="button" size="sm" variant="secondary" onClick={() => setCreating(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Nueva
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/collections" onClick={close}>
                    Ver todas
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}

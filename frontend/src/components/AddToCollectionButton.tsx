import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, Library, Plus } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { QueryErrorCard } from '@/components/QueryErrorCard';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  useAddCapsuleToCollection,
  useCollectionMemberships,
  useCreateCollection,
  useMyCollections,
  useRemoveCapsuleFromCollection,
} from '@/hooks/useCollections';
import { ApiError } from '@/lib/api';
import { slugifyCollectionName } from '@/lib/collectionSlug';
import { dismissModal } from '@/lib/modalDismiss';
import { cn } from '@/lib/utils';

type AddToCollectionButtonProps = {
  capsuleId: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'secondary' | 'ghost';
  className?: string;
  /** Icono en móvil, etiqueta desde tablet. */
  compact?: boolean;
};

export function AddToCollectionButton({
  capsuleId,
  size = 'sm',
  variant = 'outline',
  className,
  compact = false,
}: AddToCollectionButtonProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useMyCollections();
  const memberships = useCollectionMemberships(capsuleId, open);
  const addToCollection = useAddCapsuleToCollection();
  const removeFromCollection = useRemoveCapsuleFromCollection();
  const createCollection = useCreateCollection();

  const collections = data?.collections ?? [];
  const memberSet = new Set(memberships.data?.collection_ids ?? []);
  const busy = addToCollection.isPending || removeFromCollection.isPending || createCollection.isPending;

  /** Esc / backdrop / Cerrar siempre pueden salir — busy no debe atrapar el modal. */
  const close = () => {
    dismissModal({
      busy,
      onClose: () => {
        setOpen(false);
        setCreating(false);
        setNewName('');
        setPendingId(null);
      },
    });
  };

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
        className={cn(compact && 'h-9 w-9 px-0 sm:w-auto sm:px-3', className)}
        onClick={() => setOpen(true)}
        aria-label="Añadir a colección"
      >
        <Library className={cn('h-3.5 w-3.5', compact ? 'sm:mr-1.5' : 'mr-1.5')} aria-hidden />
        <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>Añadir a colección</span>
      </Button>

      <Modal open={open} title="Añadir a colección" onClose={close}>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {isLoading || (open && memberships.isLoading) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando colecciones…</p>
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
              className="border-0 py-10"
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
            <ul className="divide-y divide-border/70">
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
                        'hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        '-mx-1 rounded-lg px-1',
                        rowBusy && 'opacity-70',
                      )}
                      aria-pressed={inList}
                      aria-label={
                        inList
                          ? `Quitar de ${collection.name}`
                          : `Añadir a ${collection.name}`
                      }
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors',
                          inList
                            ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                            : 'border-border/90 bg-secondary/40 text-muted-foreground',
                        )}
                        aria-hidden
                      >
                        {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="block truncate text-sm font-medium">{collection.name}</span>
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
            <form
              onSubmit={onCreateAndAdd}
              className="mt-4 space-y-3 border-t border-primary/15 pt-4"
            >
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
            <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/15 pt-4">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border-primary/20"
                onClick={() => setCreating(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Nueva
              </Button>
              <Button asChild size="sm" variant="ghost" className="text-primary hover:text-primary">
                <Link to="/collections" onClick={close}>
                  Ver todas
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}

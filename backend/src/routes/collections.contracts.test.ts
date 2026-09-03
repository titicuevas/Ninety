import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MAX_ITEMS_PER_COLLECTION,
  addCollectionItemSchema,
  collectionCommentBodySchema,
  createCollectionSchema,
  reorderCollectionItemsSchema,
  updateCollectionSchema,
} from './collections.contracts.js';

describe('collections contracts', () => {
  it('normaliza la creación y aplica visibilidad pública por defecto', () => {
    const result = createCollectionSchema.parse({ name: '  Estadios  ', description: null });
    assert.deepEqual(result, { name: 'Estadios', description: null, is_public: true });
  });

  it('rechaza slugs, ids y comentarios inválidos', () => {
    assert.equal(updateCollectionSchema.safeParse({ slug: 'No válido' }).success, false);
    assert.equal(addCollectionItemSchema.safeParse({ capsule_id: '123' }).success, false);
    assert.equal(collectionCommentBodySchema.safeParse({ body: '   ' }).success, false);
  });

  it('limita la reordenación al máximo de elementos permitido', () => {
    const validId = '00000000-0000-4000-8000-000000000000';
    assert.equal(
      reorderCollectionItemsSchema.safeParse({
        capsule_ids: Array.from({ length: MAX_ITEMS_PER_COLLECTION }, () => validId),
      }).success,
      true,
    );
    assert.equal(
      reorderCollectionItemsSchema.safeParse({
        capsule_ids: Array.from({ length: MAX_ITEMS_PER_COLLECTION + 1 }, () => validId),
      }).success,
      false,
    );
  });
});

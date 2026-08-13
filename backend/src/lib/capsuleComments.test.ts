import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertValidReplyParent, isMissingEditedAtColumn } from './capsuleComments.js';

describe('assertValidReplyParent', () => {
  const capsuleId = '11111111-1111-4111-8111-111111111111';
  const parentId = '22222222-2222-4222-8222-222222222222';

  it('rechaza padre ausente', () => {
    assert.equal(assertValidReplyParent(null, capsuleId), 'Comentario padre no encontrado');
  });

  it('rechaza padre de otra cápsula', () => {
    assert.equal(
      assertValidReplyParent(
        { id: parentId, capsule_id: '33333333-3333-4333-8333-333333333333', parent_id: null },
        capsuleId,
      ),
      'El comentario padre no pertenece a esta Capsule',
    );
  });

  it('rechaza respuesta a una respuesta (más de 1 nivel)', () => {
    assert.equal(
      assertValidReplyParent(
        {
          id: parentId,
          capsule_id: capsuleId,
          parent_id: '44444444-4444-4444-8444-444444444444',
        },
        capsuleId,
      ),
      'Solo se permite un nivel de respuestas',
    );
  });

  it('acepta comentario raíz de la misma cápsula', () => {
    assert.equal(
      assertValidReplyParent({ id: parentId, capsule_id: capsuleId, parent_id: null }, capsuleId),
      null,
    );
  });
});

describe('isMissingEditedAtColumn', () => {
  it('detecta columna edited_at ausente', () => {
    assert.equal(
      isMissingEditedAtColumn({
        message: 'Could not find the column edited_at in the schema cache',
      }),
      true,
    );
  });
});

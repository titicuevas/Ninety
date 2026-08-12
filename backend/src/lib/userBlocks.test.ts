import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  excludeBlockedIds,
  isBlockActive,
  isMissingBlocksTable,
} from './userBlocks.js';

describe('isMissingBlocksTable', () => {
  it('detecta tabla ausente por código 42P01', () => {
    assert.equal(isMissingBlocksTable({ code: '42P01', message: 'relation does not exist' }), true);
  });

  it('detecta mensaje con user_blocks', () => {
    assert.equal(
      isMissingBlocksTable({ message: 'Could not find the table public.user_blocks' }),
      true,
    );
  });

  it('no marca errores ajenos', () => {
    assert.equal(isMissingBlocksTable({ code: '23505', message: 'duplicate key' }), false);
    assert.equal(isMissingBlocksTable(new Error('network')), false);
  });
});

describe('isBlockActive', () => {
  it('es true si bloqueé o me bloquearon', () => {
    assert.equal(isBlockActive({ blocked_by_me: true, blocked_me: false }), true);
    assert.equal(isBlockActive({ blocked_by_me: false, blocked_me: true }), true);
    assert.equal(isBlockActive({ blocked_by_me: true, blocked_me: true }), true);
  });

  it('es false sin bloqueo', () => {
    assert.equal(isBlockActive({ blocked_by_me: false, blocked_me: false }), false);
  });
});

describe('excludeBlockedIds', () => {
  it('devuelve la lista intacta si no hay bloqueados', () => {
    assert.deepEqual(excludeBlockedIds(['a', 'b'], new Set()), ['a', 'b']);
  });

  it('quita IDs bloqueados', () => {
    assert.deepEqual(excludeBlockedIds(['a', 'b', 'c'], new Set(['b'])), ['a', 'c']);
  });
});

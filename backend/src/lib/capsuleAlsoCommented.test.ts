import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { uniqueCommenterIds } from './capsuleAlsoCommented.js';

describe('uniqueCommenterIds', () => {
  it('deduplica y respeta el tope', () => {
    assert.deepEqual(
      uniqueCommenterIds(
        [
          { user_id: 'a' },
          { user_id: 'b' },
          { user_id: 'a' },
          { user_id: 'c' },
        ],
        2,
      ),
      ['a', 'b'],
    );
    assert.deepEqual(uniqueCommenterIds([]), []);
  });
});

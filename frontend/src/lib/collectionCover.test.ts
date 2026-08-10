import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCollectionCoverUrl } from './collectionCover.js';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';

describe('resolveCollectionCoverUrl', () => {
  it('prioriza la Capsule destacada y cae a la primera con foto', () => {
    assert.equal(
      resolveCollectionCoverUrl({
        coverCapsuleId: B,
        capsules: [
          { id: A, photo_urls: ['https://cdn.example/a.jpg'] },
          { id: B, photo_urls: ['https://cdn.example/b.jpg'] },
        ],
      }),
      'https://cdn.example/b.jpg',
    );

    assert.equal(
      resolveCollectionCoverUrl({
        coverCapsuleId: B,
        capsules: [
          { id: A, photo_urls: ['https://cdn.example/a.jpg'] },
          { id: B, photo_urls: [] },
        ],
      }),
      'https://cdn.example/a.jpg',
    );

    assert.equal(
      resolveCollectionCoverUrl({
        coverCapsuleId: null,
        capsules: [{ id: A, photo_urls: [] }, { id: B, photo_urls: ['https://cdn.example/b.jpg'] }],
      }),
      'https://cdn.example/b.jpg',
    );
  });
});

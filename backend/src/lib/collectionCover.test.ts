import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCollectionCoverUrl } from './collectionCover.js';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const C = '00000000-0000-4000-8000-000000000003';

describe('resolveCollectionCoverUrl', () => {
  it('usa la foto de la Capsule destacada si existe', () => {
    const url = resolveCollectionCoverUrl({
      coverCapsuleId: B,
      capsules: [
        { id: A, photo_urls: ['https://cdn.example/a.jpg'] },
        { id: B, photo_urls: ['https://cdn.example/b.jpg'] },
      ],
    });
    assert.equal(url, 'https://cdn.example/b.jpg');
  });

  it('cae a la primera Capsule con foto si la destacada no tiene', () => {
    const url = resolveCollectionCoverUrl({
      coverCapsuleId: B,
      capsules: [
        { id: A, photo_urls: ['https://cdn.example/a.jpg'] },
        { id: B, photo_urls: [] },
        { id: C, photo_urls: ['https://cdn.example/c.jpg'] },
      ],
    });
    assert.equal(url, 'https://cdn.example/a.jpg');
  });

  it('sin destacada usa la primera foto en orden', () => {
    const url = resolveCollectionCoverUrl({
      coverCapsuleId: null,
      capsules: [
        { id: A, photo_urls: [] },
        { id: B, photo_urls: ['https://cdn.example/b.jpg'] },
      ],
    });
    assert.equal(url, 'https://cdn.example/b.jpg');
  });

  it('acepta photo_url legado y devuelve null si no hay fotos', () => {
    assert.equal(
      resolveCollectionCoverUrl({
        coverCapsuleId: A,
        capsules: [{ id: A, photo_url: 'https://cdn.example/legacy.jpg' }],
      }),
      'https://cdn.example/legacy.jpg',
    );
    assert.equal(resolveCollectionCoverUrl({ capsules: [{ id: A, photo_urls: [] }] }), null);
  });
});

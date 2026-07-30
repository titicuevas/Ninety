import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { capsulePhotoPathFromUrl } from './capsulePhotoPaths.js';

describe('capsulePhotoPathFromUrl', () => {
  it('extrae path del bucket público', () => {
    const url =
      'https://xyz.supabase.co/storage/v1/object/public/capsule-photos/user-1/abc.jpg?v=1';
    assert.equal(capsulePhotoPathFromUrl(url), 'user-1/abc.jpg');
  });

  it('ignora URLs ajenas al bucket', () => {
    assert.equal(capsulePhotoPathFromUrl('https://example.com/photo.jpg'), null);
    assert.equal(
      capsulePhotoPathFromUrl(
        'https://xyz.supabase.co/storage/v1/object/public/avatars/user-1/a.jpg',
      ),
      null,
    );
  });

  it('decodifica paths con espacios', () => {
    const url =
      'https://xyz.supabase.co/storage/v1/object/public/capsule-photos/user-1/mi%20foto.jpg';
    assert.equal(capsulePhotoPathFromUrl(url), 'user-1/mi foto.jpg');
  });
});

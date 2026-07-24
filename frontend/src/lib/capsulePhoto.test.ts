import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  guessImageMime,
  takeCapsulePhotosWithinLimit,
  validateCapsulePhoto,
} from './capsulePhoto.ts';

describe('capsulePhoto helpers', () => {
  it('guessImageMime usa extensión si type está vacío (iOS)', () => {
    assert.equal(guessImageMime({ name: 'estadio.JPG', type: '' }), 'image/jpeg');
    assert.equal(guessImageMime({ name: 'foto.heic', type: '' }), 'image/heic');
    assert.equal(guessImageMime({ name: 'x.png', type: 'image/png' }), 'image/png');
  });

  it('validateCapsulePhoto acepta jpeg y rechaza tipos raros', () => {
    const jpeg = new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' });
    assert.equal(validateCapsulePhoto(jpeg), null);

    const gif = new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' });
    assert.match(validateCapsulePhoto(gif) ?? '', /JPG|PNG|WebP|HEIC/i);
  });

  it('takeCapsulePhotosWithinLimit respeta el hueco', () => {
    const files = [1, 2, 3, 4].map(
      (n) => new File([new Uint8Array([n])], `${n}.jpg`, { type: 'image/jpeg' }),
    );
    const { accepted, truncated } = takeCapsulePhotosWithinLimit(files, 7);
    assert.equal(accepted.length, 2);
    assert.equal(truncated, 2);
  });
});

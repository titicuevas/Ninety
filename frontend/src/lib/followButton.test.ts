import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { followButtonLabel } from './followButton';

describe('followButtonLabel', () => {
  it('muestra Seguir cuando no se sigue', () => {
    assert.equal(followButtonLabel({ followed: false }), 'Seguir');
  });

  it('muestra Dejar de seguir cuando ya se sigue', () => {
    assert.equal(followButtonLabel({ followed: true }), 'Dejar de seguir');
  });

  it('muestra Siguiendo… mientras el follow está en curso', () => {
    assert.equal(followButtonLabel({ followed: false, following: true }), 'Siguiendo…');
    assert.equal(followButtonLabel({ followed: true, following: true }), 'Siguiendo…');
  });

  it('muestra Dejando de seguir mientras el unfollow está en curso', () => {
    assert.equal(followButtonLabel({ followed: false, unfollowing: true }), 'Dejando de seguir');
    assert.equal(followButtonLabel({ followed: true, unfollowing: true }), 'Dejando de seguir');
  });

  it('prioriza Dejando de seguir si ambos pending flags vienen activos', () => {
    assert.equal(
      followButtonLabel({ followed: true, following: true, unfollowing: true }),
      'Dejando de seguir',
    );
  });

  it('usa Seguir de vuelta en el digest de follows', () => {
    assert.equal(followButtonLabel({ followed: false, followBack: true }), 'Seguir de vuelta');
    assert.equal(
      followButtonLabel({ followed: false, followBack: true, following: true }),
      'Siguiendo de vuelta…',
    );
    assert.equal(followButtonLabel({ followed: true, followBack: true }), 'Dejar de seguir');
  });
});

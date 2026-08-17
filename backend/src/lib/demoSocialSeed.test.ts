import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_FEATURED_COLLECTION_NAME,
  DEMO_FEATURED_COLLECTION_SLUG,
  DEMO_SOCIAL_COMMENT_MARKER,
  demoCapsuleSocialActions,
  demoFeaturedSocialActions,
  demoFollowedSocialActions,
  demoSeedCommentBody,
  isE2eCreatedCapsuleNote,
  isE2eLeftoverCollectionName,
  isE2eLeftoverNote,
} from './demoSocialSeed.js';

describe('demoSocialSeed', () => {
  it('detecta listas residuales de e2e', () => {
    assert.equal(isE2eLeftoverCollectionName('E2E likes 1786998642310'), true);
    assert.equal(isE2eLeftoverCollectionName('E2E 1786994887257'), true);
    assert.equal(isE2eLeftoverCollectionName('Derbis'), false);
    assert.equal(isE2eLeftoverCollectionName('e2e-interno'), false);
  });

  it('detecta reseñas residuales de e2e', () => {
    assert.equal(isE2eLeftoverNote('Guardado E2E 1786992152329'), true);
    assert.equal(isE2eLeftoverNote('E2E fotos 1785312235800'), true);
    assert.equal(isE2eLeftoverNote('Test E2E — Con amigos fuimos campeones (6 fotos)'), true);
    assert.equal(isE2eLeftoverNote('Partidazo en Anfield. Salah y Haaland en estado de gracia.'), false);
    assert.equal(isE2eLeftoverNote(null), false);
    assert.equal(isE2eCreatedCapsuleNote('E2E fotos 1785312235800'), true);
    assert.equal(isE2eCreatedCapsuleNote('Guardado E2E 1786992152329'), false);
  });

  it('acciones entre fans que el demo sigue, sin self', () => {
    const actions = demoFollowedSocialActions();
    assert.ok(actions.length >= 4);
    for (const action of actions) {
      assert.notEqual(action.actorIndex, action.targetIndex);
      assert.ok(action.actorIndex < 6);
      assert.ok(action.targetIndex < 6);
    }
    assert.ok(actions.some((row) => row.kind === 'capsule_comment'));
    assert.ok(actions.some((row) => row.kind === 'collection_comment'));
  });

  it('comentario con marcador estable', () => {
    assert.match(demoSeedCommentBody('capsule'), new RegExp(DEMO_SOCIAL_COMMENT_MARKER));
    assert.match(demoSeedCommentBody('collection'), new RegExp(DEMO_SOCIAL_COMMENT_MARKER));
  });

  it('lista destacada del demo no parece residual e2e', () => {
    assert.equal(DEMO_FEATURED_COLLECTION_SLUG, 'favoritos-seed');
    assert.equal(DEMO_FEATURED_COLLECTION_NAME, 'Favoritos');
    assert.equal(isE2eLeftoverCollectionName(DEMO_FEATURED_COLLECTION_NAME), false);
  });

  it('acciones sociales en Favoritos entre fans que el demo sigue', () => {
    const actions = demoFeaturedSocialActions();
    assert.equal(actions.length, 2);
    for (const action of actions) {
      assert.ok(action.actorIndex < 6);
    }
    assert.ok(actions.some((row) => row.kind === 'collection_like'));
    assert.ok(actions.some((row) => row.kind === 'collection_comment'));
  });

  it('acciones sociales en Capsule del demo entre fans que sigue', () => {
    const actions = demoCapsuleSocialActions();
    assert.equal(actions.length, 2);
    for (const action of actions) {
      assert.ok(action.actorIndex < 6);
    }
    assert.ok(actions.some((row) => row.kind === 'capsule_like'));
    assert.ok(actions.some((row) => row.kind === 'capsule_comment'));
  });
});

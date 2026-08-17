import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_SOCIAL_COMMENT_MARKER,
  demoFollowedSocialActions,
  demoSeedCommentBody,
  isE2eLeftoverCollectionName,
} from './demoSocialSeed.js';

describe('demoSocialSeed', () => {
  it('detecta listas residuales de e2e', () => {
    assert.equal(isE2eLeftoverCollectionName('E2E likes 1786998642310'), true);
    assert.equal(isE2eLeftoverCollectionName('E2E 1786994887257'), true);
    assert.equal(isE2eLeftoverCollectionName('Derbis'), false);
    assert.equal(isE2eLeftoverCollectionName('e2e-interno'), false);
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
});

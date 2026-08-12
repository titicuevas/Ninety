import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { discoverCollectionMatchLabel } from './discoverCollections.ts';

describe('discoverCollectionMatchLabel', () => {
  it('mapea motivos de descubrimiento', () => {
    assert.equal(discoverCollectionMatchLabel('following'), 'Siguiendo');
    assert.equal(discoverCollectionMatchLabel('favorite_team'), 'Mismo equipo');
    assert.equal(discoverCollectionMatchLabel('active'), 'Activa');
    assert.equal(discoverCollectionMatchLabel(null), null);
  });
});

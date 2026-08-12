import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { discoverProfileMatchLabel } from './discoverProfiles.ts';

describe('discoverProfileMatchLabel', () => {
  it('mapea motivos de descubrimiento', () => {
    assert.equal(discoverProfileMatchLabel('favorite_team'), 'Mismo equipo');
    assert.equal(discoverProfileMatchLabel('city'), 'Cerca');
    assert.equal(discoverProfileMatchLabel('country'), 'Cerca');
    assert.equal(discoverProfileMatchLabel('active'), 'Activo');
    assert.equal(discoverProfileMatchLabel(null), null);
    assert.equal(discoverProfileMatchLabel(undefined), null);
  });
});

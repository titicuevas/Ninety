import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findCuratedCompetition, getCuratedCompetitions } from './footballCompetitions.js';

describe('footballCompetitions', () => {
  it('incluye ligas, europeas y selecciones', () => {
    const codes = getCuratedCompetitions().map((c) => c.code);
    assert.ok(codes.includes('PD'));
    assert.ok(codes.includes('CL'));
    assert.ok(codes.includes('WC'));
    assert.ok(codes.includes('EC'));
  });

  it('resuelve temporada por defecto del Mundial', () => {
    const wc = findCuratedCompetition('WC');
    assert.equal(wc?.defaultSeason, 2026);
    assert.equal(wc?.teamSearchOnly, true);
    assert.equal(wc?.apiId, 2000);
    assert.deepEqual(wc?.seasons, [2026, 2022, 2018]);
  });
});

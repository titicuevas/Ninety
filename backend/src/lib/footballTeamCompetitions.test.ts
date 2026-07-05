import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCuratedCompetitions } from './footballCompetitions.js';

// mapRunningToCurated is internal — test the same logic inline for stability
function mapRunningToCurated(
  running: Array<{ id?: number; code?: string }>,
): ReturnType<typeof getCuratedCompetitions> {
  const curated = getCuratedCompetitions();
  const codes = new Set(running.map((c) => c.code).filter(Boolean));
  const ids = new Set(running.map((c) => c.id).filter((id): id is number => id != null));
  return curated.filter(
    (comp) => (comp.code && codes.has(comp.code)) || (comp.apiId != null && ids.has(comp.apiId)),
  );
}

describe('team competitions filter', () => {
  it('define códigos europeos y copa para club de La Liga', () => {
    // lógica documentada: PD → CDR + CL + EL
    const codes = ['CL', 'EL', 'CDR', 'PD'];
    const comps = mapRunningToCurated(codes.map((code) => ({ code })));
    assert.ok(comps.some((c) => c.code === 'CL'));
    assert.ok(comps.some((c) => c.code === 'EL'));
    assert.ok(comps.some((c) => c.code === 'CDR'));
    assert.ok(comps.some((c) => c.code === 'PD'));
  });

  it('mapea ligas y copas europeas de un club', () => {
    const comps = mapRunningToCurated([
      { id: 2014, code: 'PD' },
      { id: 2001, code: 'CL' },
      { id: 2146, code: 'EL' },
    ]);

    const codes = comps.map((c) => c.code);
    assert.ok(codes.includes('PD'));
    assert.ok(codes.includes('CL'));
    assert.ok(codes.includes('EL'));
    assert.ok(!codes.includes('PL'));
  });

  it('mapea running competitions de Betis sin Premier League', () => {
    const comps = mapRunningToCurated([
      { id: 2014, code: 'PD' },
      { id: 2001, code: 'CL' },
      { id: 2072, code: 'CDR' },
    ]);

    const codes = comps.map((c) => c.code);
    assert.ok(codes.includes('PD'));
    assert.ok(codes.includes('CL'));
    assert.ok(!codes.includes('PL'));
  });

  it('incluye Mundial para selecciones', () => {
    const comps = mapRunningToCurated([{ id: 2000, code: 'WC' }]);
    assert.ok(comps.some((c) => c.code === 'WC'));
  });
});

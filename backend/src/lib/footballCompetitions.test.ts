import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findCuratedCompetition,
  getCuratedCompetitions,
  leagueSeasonYears,
  seasonChipOptions,
} from './footballCompetitions.js';

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

  it('leagueSeasonYears usa julio como corte de temporada', () => {
    assert.deepEqual(leagueSeasonYears(3, new Date('2026-07-31')), [2026, 2025, 2024]);
    assert.deepEqual(leagueSeasonYears(3, new Date('2026-03-01')), [2025, 2024, 2023]);
  });

  it('seasonChipOptions para ligas incluye Cualquiera y Esta temporada', () => {
    const chips = seasonChipOptions(findCuratedCompetition('PD'), new Date('2026-07-31'));
    assert.equal(chips[0]?.value, undefined);
    assert.equal(chips[0]?.label, 'Cualquiera');
    assert.equal(chips[1]?.value, 2026);
    assert.equal(chips[1]?.label, 'Esta temporada');
  });

  it('seasonChipOptions para Mundial usa ediciones curadas', () => {
    const chips = seasonChipOptions(findCuratedCompetition('WC'));
    assert.equal(chips[0]?.value, undefined);
    assert.ok(chips.some((c) => c.value === 2026 && c.label.includes('reciente')));
    assert.ok(chips.some((c) => c.value === 2022));
  });
});

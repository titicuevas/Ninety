import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { leagueSeasonYears, seasonChipOptions } from './seasonChips.ts';

describe('seasonChips', () => {
  it('leagueSeasonYears usa julio como corte de temporada', () => {
    assert.deepEqual(leagueSeasonYears(3, new Date('2026-07-31')), [2026, 2025, 2024]);
    assert.deepEqual(leagueSeasonYears(3, new Date('2026-03-01')), [2025, 2024, 2023]);
  });

  it('seasonChipOptions para ligas incluye Cualquiera y Esta temporada', () => {
    const chips = seasonChipOptions(null, new Date('2026-07-31'));
    assert.equal(chips[0]?.value, undefined);
    assert.equal(chips[0]?.label, 'Cualquiera');
    assert.equal(chips[1]?.value, 2026);
    assert.equal(chips[1]?.label, 'Esta temporada');
  });

  it('seasonChipOptions para Mundial usa ediciones curadas', () => {
    const chips = seasonChipOptions({
      defaultSeason: 2026,
      seasons: [2026, 2022, 2018],
    });
    assert.equal(chips[0]?.value, undefined);
    assert.ok(chips.some((c) => c.value === 2026 && c.label.includes('reciente')));
    assert.ok(chips.some((c) => c.value === 2022));
  });
});

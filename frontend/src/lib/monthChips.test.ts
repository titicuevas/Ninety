import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { monthChipOptions, monthHintLabel, parseMonthParam } from './monthChips.ts';

describe('monthChips', () => {
  it('monthChipOptions incluye Cualquiera y 12 meses', () => {
    const chips = monthChipOptions();
    assert.equal(chips[0]?.value, undefined);
    assert.equal(chips[0]?.label, 'Cualquier mes');
    assert.equal(chips.length, 13);
    assert.equal(chips[3]?.value, 3);
    assert.equal(chips[3]?.label, 'Mar');
    assert.equal(chips[12]?.value, 12);
    assert.equal(chips[12]?.label, 'Dic');
  });

  it('parseMonthParam valida 1–12', () => {
    assert.equal(parseMonthParam('5'), 5);
    assert.equal(parseMonthParam('0'), undefined);
    assert.equal(parseMonthParam(null), undefined);
  });

  it('monthHintLabel mapea temporada de liga', () => {
    assert.equal(monthHintLabel(3, 2024, null, new Date('2026-01-01')), 'Mar 2025');
    assert.equal(monthHintLabel(8, 2024, null, new Date('2026-01-01')), 'Ago 2024');
  });

  it('monthHintLabel usa año civil en Mundial', () => {
    assert.equal(
      monthHintLabel(11, 2022, { seasons: [2022, 2018] }, new Date('2026-01-01')),
      'Nov 2022',
    );
  });
});

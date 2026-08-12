import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRatingMin,
  parseVisibility,
  parseWatchContext,
  parseYear,
  parseTag,
} from './diaryFilters.ts';

describe('parseYear', () => {
  it('acepta años enteros en rango', () => {
    assert.equal(parseYear('2024'), 2024);
    assert.equal(parseYear('1990'), 1990);
    assert.equal(parseYear('2100'), 2100);
  });

  it('rechaza vacíos, decimales y fuera de rango', () => {
    assert.equal(parseYear(null), undefined);
    assert.equal(parseYear(''), undefined);
    assert.equal(parseYear('2024.5'), undefined);
    assert.equal(parseYear('1989'), undefined);
    assert.equal(parseYear('2101'), undefined);
    assert.equal(parseYear('abc'), undefined);
  });
});

describe('parseRatingMin', () => {
  it('acepta 3, 4 y 5', () => {
    assert.equal(parseRatingMin('3'), 3);
    assert.equal(parseRatingMin('4'), 4);
    assert.equal(parseRatingMin('5'), 5);
  });

  it('rechaza otros valores', () => {
    assert.equal(parseRatingMin(null), undefined);
    assert.equal(parseRatingMin('1'), undefined);
    assert.equal(parseRatingMin('2'), undefined);
    assert.equal(parseRatingMin('6'), undefined);
    assert.equal(parseRatingMin('4.5'), undefined);
  });
});

describe('parseVisibility', () => {
  it('lee public y private; default all', () => {
    assert.equal(parseVisibility('public'), 'public');
    assert.equal(parseVisibility('private'), 'private');
    assert.equal(parseVisibility(null), 'all');
    assert.equal(parseVisibility('all'), 'all');
    assert.equal(parseVisibility('other'), 'all');
  });
});

describe('parseWatchContext', () => {
  it('acepta contextos válidos', () => {
    assert.equal(parseWatchContext('tv'), 'tv');
    assert.equal(parseWatchContext('stadium'), 'stadium');
  });

  it('rechaza inválidos', () => {
    assert.equal(parseWatchContext(null), undefined);
    assert.equal(parseWatchContext('cinema'), undefined);
  });
});

describe('parseTag', () => {
  it('normaliza etiquetas válidas', () => {
    assert.equal(parseTag('Clásico'), 'clásico');
    assert.equal(parseTag('viaje'), 'viaje');
  });

  it('rechaza inválidos', () => {
    assert.equal(parseTag(null), undefined);
    assert.equal(parseTag(''), undefined);
    assert.equal(parseTag('bad!'), undefined);
  });
});

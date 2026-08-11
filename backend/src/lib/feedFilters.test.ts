import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFeedContentFilters,
  parseFeedPhotosParam,
  resolveFeedContentFilters,
  sanitizeFeedCompetition,
} from './feedFilters.js';

describe('sanitizeFeedCompetition', () => {
  it('normaliza y elimina comodines', () => {
    assert.equal(sanitizeFeedCompetition('  La Liga  '), 'la liga');
    assert.equal(sanitizeFeedCompetition('Champions%League'), 'championsleague');
    assert.equal(sanitizeFeedCompetition('a,b(c)'), 'abc');
    assert.equal(sanitizeFeedCompetition(undefined), '');
  });
});

describe('parseFeedPhotosParam', () => {
  it('acepta 1/true/yes', () => {
    assert.equal(parseFeedPhotosParam('1'), true);
    assert.equal(parseFeedPhotosParam('true'), true);
    assert.equal(parseFeedPhotosParam('YES'), true);
    assert.equal(parseFeedPhotosParam(1), true);
    assert.equal(parseFeedPhotosParam(true), true);
  });

  it('rechaza resto', () => {
    assert.equal(parseFeedPhotosParam(undefined), false);
    assert.equal(parseFeedPhotosParam('0'), false);
    assert.equal(parseFeedPhotosParam('false'), false);
    assert.equal(parseFeedPhotosParam(''), false);
  });
});

describe('resolveFeedContentFilters', () => {
  it('exige ≥2 chars en competición', () => {
    assert.deepEqual(resolveFeedContentFilters({ competition: 'L' }), {
      photosOnly: false,
      competition: '',
    });
    assert.deepEqual(resolveFeedContentFilters({ photos: '1', competition: 'La Liga' }), {
      photosOnly: true,
      competition: 'la liga',
    });
  });
});

describe('applyFeedContentFilters', () => {
  it('encadena not/ilike según filtros', () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const chain = {
      not(...args: unknown[]) {
        calls.push({ method: 'not', args });
        return this;
      },
      ilike(...args: unknown[]) {
        calls.push({ method: 'ilike', args });
        return this;
      },
    };

    applyFeedContentFilters(chain, { photosOnly: true, competition: 'la liga' });
    assert.deepEqual(calls, [
      { method: 'not', args: ['photo_urls', 'eq', '{}'] },
      { method: 'ilike', args: ['competition_name', '%la liga%'] },
    ]);
  });

  it('no toca el query sin filtros', () => {
    const base = { id: 'q' };
    assert.equal(applyFeedContentFilters(base, { photosOnly: false, competition: '' }), base);
  });
});

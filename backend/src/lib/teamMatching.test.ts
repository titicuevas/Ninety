import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeTeamText, rankTeamsByQuery } from './teamMatching.js';

const SAMPLE_TEAMS = [
  { id: 86, name: 'Real Madrid CF', shortName: 'Real Madrid' },
  { id: 78, name: 'Club Atlético de Madrid', shortName: 'Atleti' },
  { id: 90, name: 'Real Betis Balompié', shortName: 'Betis' },
  { id: 81, name: 'FC Barcelona', shortName: 'Barça' },
  { id: 760, name: 'Spain', shortName: 'Spain' },
  { id: 758, name: 'Argentina', shortName: 'Argentina' },
];

describe('teamMatching', () => {
  it('encuentra Real Betis con "betis"', () => {
    const ranked = rankTeamsByQuery(SAMPLE_TEAMS, 'betis');
    assert.equal(ranked[0]?.name, 'Real Betis Balompié');
  });

  it('prioriza Real Madrid con "madrid" sin incluir Atlético', () => {
    const ranked = rankTeamsByQuery(SAMPLE_TEAMS, 'madrid');
    assert.equal(ranked[0]?.name, 'Real Madrid CF');
    assert.ok(!ranked.some((team) => team.name.includes('Atlético')));
  });

  it('prioriza FC Barcelona con "barcelona" sin incluir Espanyol', () => {
    const ranked = rankTeamsByQuery(
      [
        { id: 81, name: 'FC Barcelona', shortName: 'Barça' },
        { id: 80, name: 'RCD Espanyol de Barcelona', shortName: 'Espanyol' },
      ],
      'barcelona',
    );
    assert.equal(ranked[0]?.name, 'FC Barcelona');
    assert.ok(!ranked.some((team) => team.name.includes('Espanyol')));
  });

  it('encuentra Atlético con "atletico"', () => {
    const ranked = rankTeamsByQuery(SAMPLE_TEAMS, 'atletico');
    assert.equal(ranked[0]?.name, 'Club Atlético de Madrid');
  });

  it('normaliza acentos y mayúsculas', () => {
    assert.equal(normalizeTeamText('Atlético'), 'atletico');
    assert.equal(normalizeTeamText('  Real   Betis '), 'real betis');
  });

  it('resuelve selecciones en español', () => {
    const ranked = rankTeamsByQuery(SAMPLE_TEAMS, 'españa');
    assert.equal(ranked[0]?.name, 'Spain');
  });
});

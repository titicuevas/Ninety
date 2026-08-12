import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { slugifyTeamName, teamPath, teamPathFromFavorite } from './teamPath.ts';

describe('slugifyTeamName', () => {
  it('normaliza nombres de club', () => {
    assert.equal(slugifyTeamName('Real Betis'), 'real-betis');
    assert.equal(slugifyTeamName('Atlético de Madrid'), 'atletico-de-madrid');
  });
});

describe('teamPath', () => {
  it('construye /teams/:slug', () => {
    assert.equal(teamPath('Real Betis'), '/teams/real-betis');
  });

  it('teamPathFromFavorite ignora vacío', () => {
    assert.equal(teamPathFromFavorite(null), null);
    assert.equal(teamPathFromFavorite('  '), null);
    assert.equal(teamPathFromFavorite('Betis'), '/teams/betis');
  });
});

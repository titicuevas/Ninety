import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applySearchTab,
  parseSearchTab,
  searchTabDocumentTitle,
} from './searchTabs.ts';

describe('searchTabs', () => {
  it('parsea pestaña y títulos', () => {
    assert.equal(parseSearchTab('people'), 'people');
    assert.equal(parseSearchTab('lists'), 'lists');
    assert.equal(parseSearchTab(null), 'matches');
    assert.equal(parseSearchTab('spam'), 'matches');
    assert.equal(searchTabDocumentTitle('lists'), 'Buscar listas');
    assert.equal(searchTabDocumentTitle('people'), 'Buscar aficionados');
    assert.equal(searchTabDocumentTitle('matches'), 'Buscar partido');
  });

  it('al cambiar de pestaña quita reason y sort ajenos', () => {
    const fromPeople = applySearchTab(
      new URLSearchParams('tab=people&q=betis&reason=nearby'),
      'lists',
    );
    assert.equal(fromPeople.get('tab'), 'lists');
    assert.equal(fromPeople.get('q'), 'betis');
    assert.equal(fromPeople.get('reason'), null);

    const fromLists = applySearchTab(
      new URLSearchParams('tab=lists&q=clásicos&sort=recent'),
      'people',
    );
    assert.equal(fromLists.get('tab'), 'people');
    assert.equal(fromLists.get('sort'), null);

    const toMatches = applySearchTab(
      new URLSearchParams('tab=lists&q=betis&sort=likes'),
      'matches',
    );
    assert.equal(toMatches.get('tab'), null);
    assert.equal(toMatches.get('sort'), null);
    assert.equal(toMatches.get('q'), 'betis');
  });
});

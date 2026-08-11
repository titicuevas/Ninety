import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  feedDocumentTitle,
  feedPath,
  feedSearchParams,
  hasFeedContentFilters,
  parseFeedCompetition,
  parseFeedPhotos,
  parseFeedScope,
  parseFeedSort,
} from './feedParams.ts';

describe('parseFeedScope', () => {
  it('acepta explore; default following', () => {
    assert.equal(parseFeedScope('explore'), 'explore');
    assert.equal(parseFeedScope('following'), 'following');
    assert.equal(parseFeedScope(null), 'following');
    assert.equal(parseFeedScope(''), 'following');
    assert.equal(parseFeedScope('other'), 'following');
  });
});

describe('parseFeedSort', () => {
  it('acepta popular; default recent', () => {
    assert.equal(parseFeedSort('popular'), 'popular');
    assert.equal(parseFeedSort('recent'), 'recent');
    assert.equal(parseFeedSort(null), 'recent');
    assert.equal(parseFeedSort('hot'), 'recent');
  });
});

describe('parseFeedPhotos / parseFeedCompetition', () => {
  it('photos solo con 1/true/yes', () => {
    assert.equal(parseFeedPhotos('1'), true);
    assert.equal(parseFeedPhotos('true'), true);
    assert.equal(parseFeedPhotos(null), false);
    assert.equal(parseFeedPhotos('0'), false);
  });

  it('competition exige ≥2 chars y limpia comodines', () => {
    assert.equal(parseFeedCompetition('La Liga'), 'La Liga');
    assert.equal(parseFeedCompetition('a'), '');
    assert.equal(parseFeedCompetition('Champions%'), 'Champions');
    assert.equal(parseFeedCompetition(null), '');
  });
});

describe('feedSearchParams / feedPath', () => {
  it('omite defaults', () => {
    assert.equal(feedSearchParams('following', 'recent'), '');
    assert.equal(feedPath(), '/feed');
  });

  it('serializa solo valores no default', () => {
    assert.equal(feedSearchParams('explore', 'recent'), '?scope=explore');
    assert.equal(feedSearchParams('following', 'popular'), '?sort=popular');
    assert.equal(feedSearchParams('explore', 'popular'), '?scope=explore&sort=popular');
    assert.equal(feedPath('explore', 'popular'), '/feed?scope=explore&sort=popular');
  });

  it('incluye fotos y competición', () => {
    assert.equal(
      feedSearchParams('following', 'recent', { photosOnly: true, competition: '' }),
      '?photos=1',
    );
    assert.equal(
      feedSearchParams('explore', 'popular', { photosOnly: true, competition: 'La Liga' }),
      '?scope=explore&sort=popular&photos=1&competition=La+Liga',
    );
    assert.equal(
      feedPath('following', 'recent', { photosOnly: false, competition: 'Champions' }),
      '/feed?competition=Champions',
    );
  });
});

describe('hasFeedContentFilters / feedDocumentTitle', () => {
  it('detecta filtros activos', () => {
    assert.equal(hasFeedContentFilters({ photosOnly: false, competition: '' }), false);
    assert.equal(hasFeedContentFilters({ photosOnly: true, competition: '' }), true);
    assert.equal(hasFeedContentFilters({ photosOnly: false, competition: 'La Liga' }), true);
  });

  it('refleja alcance, orden y filtros', () => {
    assert.equal(feedDocumentTitle('following', 'recent'), 'Feed');
    assert.equal(feedDocumentTitle('explore', 'recent'), 'Explorar');
    assert.equal(feedDocumentTitle('following', 'popular'), 'Feed · Populares');
    assert.equal(feedDocumentTitle('explore', 'popular'), 'Explorar · Populares');
    assert.equal(
      feedDocumentTitle('explore', 'recent', { photosOnly: true, competition: 'La Liga' }),
      'Explorar · La Liga · Fotos',
    );
  });
});

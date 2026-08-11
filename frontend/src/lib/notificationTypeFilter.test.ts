import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasNotificationTypeFilter,
  notificationDocumentTitle,
  notificationTypeEmptyCopy,
  notificationTypePath,
  notificationTypeSearchParams,
  parseNotificationTypeParam,
} from './notificationTypeFilter.ts';

describe('parseNotificationTypeParam', () => {
  it('acepta like / comment / follow', () => {
    assert.equal(parseNotificationTypeParam('like'), 'like');
    assert.equal(parseNotificationTypeParam('COMMENT'), 'comment');
    assert.equal(parseNotificationTypeParam(' follow '), 'follow');
  });

  it('rechaza vacío o desconocidos', () => {
    assert.equal(parseNotificationTypeParam(null), null);
    assert.equal(parseNotificationTypeParam(''), null);
    assert.equal(parseNotificationTypeParam('all'), null);
    assert.equal(parseNotificationTypeParam('likes'), null);
  });
});

describe('notificationTypeSearchParams / path', () => {
  it('omite default y serializa type', () => {
    assert.equal(notificationTypeSearchParams(null), '');
    assert.equal(notificationTypeSearchParams('like'), '?type=like');
    assert.equal(notificationTypePath(null), '/notifications');
    assert.equal(notificationTypePath('follow'), '/notifications?type=follow');
  });
});

describe('hasNotificationTypeFilter / empty / title', () => {
  it('detecta filtro activo', () => {
    assert.equal(hasNotificationTypeFilter(null), false);
    assert.equal(hasNotificationTypeFilter('like'), true);
  });

  it('copia de empty por tipo', () => {
    assert.match(notificationTypeEmptyCopy('like').title, /me gusta/i);
    assert.match(notificationTypeEmptyCopy('comment').title, /comentarios/i);
    assert.match(notificationTypeEmptyCopy('follow').title, /seguidores/i);
  });

  it('título de documento', () => {
    assert.equal(notificationDocumentTitle(null), 'Notificaciones');
    assert.equal(notificationDocumentTitle('comment'), 'Notificaciones · Comentarios');
  });
});

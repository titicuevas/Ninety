import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  notificationDbTypesForFilter,
  parseNotificationTypeFilter,
} from './notificationTypeFilter.js';

describe('parseNotificationTypeFilter', () => {
  it('acepta like / comment / follow / mention (case-insensitive)', () => {
    assert.equal(parseNotificationTypeFilter('like'), 'like');
    assert.equal(parseNotificationTypeFilter('COMMENT'), 'comment');
    assert.equal(parseNotificationTypeFilter(' Follow '), 'follow');
    assert.equal(parseNotificationTypeFilter('mention'), 'mention');
  });

  it('rechaza vacío, basura o tipos desconocidos', () => {
    assert.equal(parseNotificationTypeFilter(undefined), null);
    assert.equal(parseNotificationTypeFilter(null), null);
    assert.equal(parseNotificationTypeFilter(''), null);
    assert.equal(parseNotificationTypeFilter('likes'), null);
    assert.equal(parseNotificationTypeFilter('all'), null);
    assert.equal(parseNotificationTypeFilter(1), null);
  });
});

describe('notificationDbTypesForFilter', () => {
  it('like incluye collection_like', () => {
    assert.deepEqual(notificationDbTypesForFilter('like'), ['like', 'collection_like']);
    assert.deepEqual(notificationDbTypesForFilter('comment'), ['comment']);
  });
});

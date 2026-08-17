import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activityDocumentTitle,
  activityTypeEmptyCopy,
  activityTypePath,
  hasActivityTypeFilter,
  parseActivityTypeParam,
} from './activityTypeFilter.ts';

describe('activityTypeFilter', () => {
  it('parsea type válido o ignora basura', () => {
    assert.equal(parseActivityTypeParam(null), null);
    assert.equal(parseActivityTypeParam('capsule'), 'capsule');
    assert.equal(parseActivityTypeParam('COLLECTION'), 'collection');
    assert.equal(parseActivityTypeParam('like'), null);
  });

  it('ruta y empty copy', () => {
    assert.equal(activityTypePath(null), '/activity');
    assert.equal(activityTypePath('capsule'), '/activity?type=capsule');
    assert.equal(hasActivityTypeFilter('collection'), true);
    assert.match(activityTypeEmptyCopy('capsule').title, /Capsules/i);
    assert.match(activityTypeEmptyCopy('capsule').description, /comente/i);
    assert.match(activityTypeEmptyCopy('collection').description, /comenten/i);
    assert.match(activityDocumentTitle('collection'), /Listas/i);
  });
});

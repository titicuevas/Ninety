import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  featuredCollectionMigrationHint,
  isMissingFeaturedCollectionColumn,
} from './featuredCollection.js';

describe('featuredCollection', () => {
  it('detecta columna ausente', () => {
    assert.equal(
      isMissingFeaturedCollectionColumn({
        message: 'Could not find the column featured_collection_id in the schema cache',
      }),
      true,
    );
  });

  it('hint de migración', () => {
    assert.match(featuredCollectionMigrationHint(), /20250826120000_featured_collection/);
  });
});

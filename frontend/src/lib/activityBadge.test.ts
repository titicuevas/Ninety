import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { activityShortcutAriaLabel, formatActivityBadgeCount } from './activityBadge.ts';

describe('activityBadge', () => {
  it('formatea contador del badge', () => {
    assert.equal(formatActivityBadgeCount(0), null);
    assert.equal(formatActivityBadgeCount(3), '3');
    assert.equal(formatActivityBadgeCount(10), '9+');
  });

  it('aria-label del atajo Actividad', () => {
    assert.equal(activityShortcutAriaLabel(0), 'Actividad');
    assert.equal(activityShortcutAriaLabel(1), 'Actividad (1 evento)');
    assert.equal(activityShortcutAriaLabel(4), 'Actividad (4 eventos)');
    assert.equal(activityShortcutAriaLabel(12), 'Actividad (más de 9 eventos)');
  });
});

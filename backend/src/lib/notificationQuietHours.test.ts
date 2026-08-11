import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatHhMm,
  isValidIanaTimeZone,
  isWithinPushQuietHours,
  localMinutesOfDay,
  mapPushQuietHoursRow,
  normalizePushQuietHours,
  parseHhMm,
} from './notificationQuietHours.js';

describe('parseHhMm / formatHhMm', () => {
  it('parsea HH:MM válidos', () => {
    assert.equal(parseHhMm('00:00'), 0);
    assert.equal(parseHhMm('22:00'), 1320);
    assert.equal(parseHhMm('08:30'), 510);
    assert.equal(parseHhMm('23:59'), 1439);
  });

  it('rechaza inválidos', () => {
    assert.equal(parseHhMm('24:00'), null);
    assert.equal(parseHhMm('9:00'), null);
    assert.equal(parseHhMm('22:60'), null);
    assert.equal(parseHhMm(''), null);
  });

  it('formatea minutos', () => {
    assert.equal(formatHhMm(0), '00:00');
    assert.equal(formatHhMm(1320), '22:00');
    assert.equal(formatHhMm(1439), '23:59');
  });
});

describe('isValidIanaTimeZone', () => {
  it('acepta zonas conocidas', () => {
    assert.equal(isValidIanaTimeZone('UTC'), true);
    assert.equal(isValidIanaTimeZone('Europe/Madrid'), true);
  });

  it('rechaza basura', () => {
    assert.equal(isValidIanaTimeZone(''), false);
    assert.equal(isValidIanaTimeZone('Not/AZone'), false);
  });
});

describe('localMinutesOfDay', () => {
  it('lee minutos en UTC', () => {
    const noon = new Date('2026-08-11T12:30:00.000Z');
    assert.equal(localMinutesOfDay(noon, 'UTC'), 12 * 60 + 30);
  });
});

describe('isWithinPushQuietHours', () => {
  const overnight = {
    enabled: true,
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
  };

  it('fuera si desactivado', () => {
    assert.equal(
      isWithinPushQuietHours({ ...overnight, enabled: false }, new Date('2026-08-11T23:00:00.000Z')),
      false,
    );
  });

  it('cruza medianoche', () => {
    assert.equal(isWithinPushQuietHours(overnight, new Date('2026-08-11T22:00:00.000Z')), true);
    assert.equal(isWithinPushQuietHours(overnight, new Date('2026-08-11T23:30:00.000Z')), true);
    assert.equal(isWithinPushQuietHours(overnight, new Date('2026-08-11T07:59:00.000Z')), true);
    assert.equal(isWithinPushQuietHours(overnight, new Date('2026-08-11T08:00:00.000Z')), false);
    assert.equal(isWithinPushQuietHours(overnight, new Date('2026-08-11T12:00:00.000Z')), false);
    assert.equal(isWithinPushQuietHours(overnight, new Date('2026-08-11T21:59:00.000Z')), false);
  });

  it('ventana diurna', () => {
    const nap = { enabled: true, start: '13:00', end: '14:00', timezone: 'UTC' };
    assert.equal(isWithinPushQuietHours(nap, new Date('2026-08-11T13:00:00.000Z')), true);
    assert.equal(isWithinPushQuietHours(nap, new Date('2026-08-11T13:59:00.000Z')), true);
    assert.equal(isWithinPushQuietHours(nap, new Date('2026-08-11T14:00:00.000Z')), false);
    assert.equal(isWithinPushQuietHours(nap, new Date('2026-08-11T12:59:00.000Z')), false);
  });

  it('start === end no silencia', () => {
    assert.equal(
      isWithinPushQuietHours(
        { enabled: true, start: '10:00', end: '10:00', timezone: 'UTC' },
        new Date('2026-08-11T10:00:00.000Z'),
      ),
      false,
    );
  });
});

describe('normalize / map row', () => {
  it('normaliza defaults', () => {
    assert.deepEqual(normalizePushQuietHours(null), {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
    });
  });

  it('mapea time de Postgres', () => {
    assert.deepEqual(
      mapPushQuietHoursRow({
        push_quiet_enabled: true,
        push_quiet_start: '22:00:00',
        push_quiet_end: '08:00:00',
        push_quiet_timezone: 'Europe/Madrid',
      }),
      {
        enabled: true,
        start: '22:00',
        end: '08:00',
        timezone: 'Europe/Madrid',
      },
    );
  });
});

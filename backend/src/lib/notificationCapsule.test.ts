import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNotificationPushBody,
  formatMatchContext,
  formatMatchLabel,
  mapNotificationCapsule,
  pickCapsuleThumbUrl,
} from './notificationCapsule.js';

describe('pickCapsuleThumbUrl / mapNotificationCapsule', () => {
  it('prioriza photo_urls y cae a photo_url', () => {
    assert.equal(
      pickCapsuleThumbUrl({
        photo_urls: ['https://cdn.example/a.jpg'],
        photo_url: 'https://cdn.example/legacy.jpg',
      }),
      'https://cdn.example/a.jpg',
    );
    assert.equal(
      pickCapsuleThumbUrl({ photo_urls: [], photo_url: 'https://cdn.example/legacy.jpg' }),
      'https://cdn.example/legacy.jpg',
    );
    assert.equal(pickCapsuleThumbUrl({ photo_urls: [''], photo_url: null }), null);
  });

  it('mapea Capsule válida y descarta filas incompletas', () => {
    const mapped = mapNotificationCapsule({
      id: 'c1',
      home_team_name: ' Betis ',
      away_team_name: 'Sevilla',
      competition_name: ' LaLiga ',
      photo_urls: ['https://cdn.example/a.jpg'],
    });
    assert.deepEqual(mapped, {
      id: 'c1',
      home_team_name: 'Betis',
      away_team_name: 'Sevilla',
      competition_name: 'LaLiga',
      thumb_url: 'https://cdn.example/a.jpg',
    });

    assert.equal(
      mapNotificationCapsule({
        id: 'c2',
        home_team_name: '',
        away_team_name: 'Sevilla',
        competition_name: null,
      }),
      null,
    );
    assert.equal(mapNotificationCapsule(null), null);
  });
});

describe('formatMatchLabel / formatMatchContext', () => {
  it('formatea partido y competición', () => {
    assert.equal(
      formatMatchLabel({ home_team_name: 'Betis', away_team_name: 'Sevilla' }),
      'Betis vs Sevilla',
    );
    assert.equal(
      formatMatchContext({
        home_team_name: 'Betis',
        away_team_name: 'Sevilla',
        competition_name: 'LaLiga',
      }),
      'Betis vs Sevilla · LaLiga',
    );
    assert.equal(
      formatMatchContext({
        home_team_name: 'Betis',
        away_team_name: 'Sevilla',
        competition_name: '  ',
      }),
      'Betis vs Sevilla',
    );
  });
});

describe('buildNotificationPushBody', () => {
  it('incluye el partido en like y comment', () => {
    assert.equal(
      buildNotificationPushBody({
        type: 'like',
        actorName: 'Ana',
        matchLabel: 'Betis vs Sevilla',
      }),
      'A Ana le gustó Betis vs Sevilla',
    );
    assert.equal(
      buildNotificationPushBody({
        type: 'comment',
        actorName: 'Ana',
        matchLabel: 'Betis vs Sevilla',
        commentSnippet: 'Qué partidazo',
      }),
      'Ana en Betis vs Sevilla: «Qué partidazo»',
    );
    assert.equal(
      buildNotificationPushBody({
        type: 'comment',
        actorName: 'Ana',
        matchLabel: 'Betis vs Sevilla',
      }),
      'Ana comentó en Betis vs Sevilla',
    );
  });

  it('mantiene fallbacks sin partido', () => {
    assert.equal(
      buildNotificationPushBody({ type: 'like', actorName: 'Ana' }),
      'A Ana le gustó tu cápsula',
    );
    assert.equal(
      buildNotificationPushBody({
        type: 'comment',
        actorName: 'Ana',
        commentSnippet: 'Golazo',
      }),
      'Ana: «Golazo»',
    );
    assert.equal(
      buildNotificationPushBody({ type: 'follow', actorName: '@ana' }),
      '@ana te empezó a seguir',
    );
    assert.equal(
      buildNotificationPushBody({
        type: 'mention',
        actorName: 'Ana',
        commentSnippet: 'Hola @tú',
      }),
      'Ana te mencionó: «Hola @tú»',
    );
    assert.equal(
      buildNotificationPushBody({
        type: 'comment',
        actorName: 'Ana',
        onCollection: true,
      }),
      'Ana comentó en tu lista',
    );
  });
});

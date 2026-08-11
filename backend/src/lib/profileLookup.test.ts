import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PROFILE_PUBLIC_SELECT_CORE,
  PROFILE_PUBLIC_SELECT_WITH_BIO,
  fetchProfileByUsername,
  isMissingProfileColumn,
  profilesAlignMigrationHint,
} from './profileLookup.js';

describe('isMissingProfileColumn', () => {
  it('detecta 42703 y mensajes de columna inexistente', () => {
    assert.equal(isMissingProfileColumn({ code: '42703', message: 'column profiles.bio does not exist' }, 'bio'), true);
    assert.equal(
      isMissingProfileColumn({ message: 'Could not find the column in the schema cache' }, 'bio'),
      true,
    );
    assert.equal(isMissingProfileColumn({ code: 'PGRST116', message: 'no rows' }, 'bio'), false);
    assert.equal(isMissingProfileColumn(null), false);
  });

  it('exige el nombre de columna cuando se pide', () => {
    assert.equal(
      isMissingProfileColumn({ code: '42703', message: 'column profiles.updated_at does not exist' }, 'bio'),
      false,
    );
  });
});

describe('PROFILE_PUBLIC_SELECT', () => {
  it('incluye bio solo en la variante with-bio', () => {
    assert.match(PROFILE_PUBLIC_SELECT_WITH_BIO, /\bbio\b/);
    assert.doesNotMatch(PROFILE_PUBLIC_SELECT_CORE, /\bbio\b/);
  });
});

describe('fetchProfileByUsername', () => {
  it('devuelve not_found si el username queda vacío', async () => {
    const result = await fetchProfileByUsername({} as never, '   ');
    assert.equal(result.error, 'not_found');
    assert.equal(result.profile, null);
  });

  it('reintenta sin bio cuando PostgREST reporta columna bio inexistente', async () => {
    const calls: string[] = [];
    const row = {
      id: '1',
      username: 'aficionado_demo',
      full_name: 'Aficionado Demo',
      avatar_url: null,
      favorite_team: null,
      country: null,
      city: null,
      created_at: '2026-01-01T00:00:00Z',
    };

    const client = {
      from() {
        return {
          select(columns: string) {
            calls.push(columns);
            return {
              eq() {
                return {
                  maybeSingle: async () => {
                    if (columns.includes('bio')) {
                      return {
                        data: null,
                        error: { code: '42703', message: 'column profiles.bio does not exist' },
                      };
                    }
                    return { data: row, error: null };
                  },
                };
              },
            };
          },
        };
      },
    };

    const result = await fetchProfileByUsername(client as never, 'Aficionado_Demo');
    assert.equal(result.error, null);
    assert.equal(result.profile?.username, 'aficionado_demo');
    assert.equal(result.profile?.bio, null);
    assert.equal(calls.length, 2);
    assert.match(calls[0]!, /\bbio\b/);
    assert.doesNotMatch(calls[1]!, /\bbio\b/);
  });

  it('expone hint de migración en schema residual', async () => {
    assert.match(profilesAlignMigrationHint(), /profiles_align/);
  });
});

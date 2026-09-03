import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  profileFollowListQuerySchema,
  profileSearchQuerySchema,
  profilesByTeamQuerySchema,
  updateProfileSchema,
  usernameAvailableQuerySchema,
} from './profile.contracts.js';

describe('profile contracts', () => {
  it('normaliza username y aplica paginación por defecto', () => {
    assert.deepEqual(usernameAvailableQuerySchema.parse({ u: '  Ninety_90  ' }), {
      u: 'ninety_90',
    });
    assert.deepEqual(profileFollowListQuerySchema.parse({}), { limit: 30, offset: 0 });
  });

  it('rechaza usernames, búsquedas y perfiles inválidos', () => {
    assert.equal(updateProfileSchema.safeParse({ username: 'Nombre Malo' }).success, false);
    assert.equal(updateProfileSchema.safeParse({ bio: 'x'.repeat(281) }).success, false);
    assert.equal(profileSearchQuerySchema.safeParse({ q: 'a' }).success, false);
    assert.equal(usernameAvailableQuerySchema.safeParse({ u: '   ' }).success, false);
  });

  it('normaliza filtros de equipo y limita páginas', () => {
    assert.deepEqual(profilesByTeamQuerySchema.parse({ slug: '  betis  ' }), {
      slug: 'betis',
      limit: 30,
      offset: 0,
    });
    assert.equal(profileFollowListQuerySchema.safeParse({ limit: 51 }).success, false);
  });
});

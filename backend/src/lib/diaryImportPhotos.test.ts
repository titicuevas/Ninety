import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DIARY_IMPORT_MAX_PHOTOS_RESTORE,
  fetchRemotePhotoBuffer,
  isOwnedCapsulePhotoUrl,
  restorePhotosForCapsules,
  restoreSinglePhotoUrl,
} from './diaryImportPhotos.js';

const ownedUrl =
  'https://xyz.supabase.co/storage/v1/object/public/capsule-photos/user-1/abc.jpg';
const remoteUrl = 'https://cdn.example/photo.jpg';

describe('diaryImportPhotos', () => {
  it('isOwnedCapsulePhotoUrl detecta fotos del mismo usuario', () => {
    assert.equal(isOwnedCapsulePhotoUrl(ownedUrl, 'user-1'), true);
    assert.equal(isOwnedCapsulePhotoUrl(ownedUrl, 'user-2'), false);
    assert.equal(isOwnedCapsulePhotoUrl(remoteUrl, 'user-1'), false);
  });

  it('restoreSinglePhotoUrl reutiliza URL propia sin fetch', async () => {
    let fetched = false;
    const url = await restoreSinglePhotoUrl(ownedUrl, 'user-1', {
      fetchRemote: async () => {
        fetched = true;
        return null;
      },
      upload: async () => 'should-not-run',
    });
    assert.equal(url, ownedUrl);
    assert.equal(fetched, false);
  });

  it('restoreSinglePhotoUrl sube remota válida', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(200, 0x00)]);
    const url = await restoreSinglePhotoUrl(remoteUrl, 'user-1', {
      fetchRemote: async () => ({ buffer: jpeg, mime: 'image/jpeg' }),
      upload: async () => 'https://cdn.example/new.jpg',
    });
    assert.equal(url, 'https://cdn.example/new.jpg');
  });

  it('restorePhotosForCapsules respeta límite global', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(200, 0x00)]);
    const { summary } = await restorePhotosForCapsules(
      [
        { capsuleId: 'c1', sourceUrls: ['https://a/1.jpg', 'https://a/2.jpg'] },
        { capsuleId: 'c2', sourceUrls: ['https://a/3.jpg'] },
      ],
      'user-1',
      {
        maxPhotos: 2,
        fetchRemote: async () => ({ buffer: jpeg, mime: 'image/jpeg' }),
        upload: async (_uid, _buf, _mime) => `https://cdn.example/${crypto.randomUUID()}.jpg`,
      },
    );
    assert.equal(summary.photos_restored, 2);
    assert.equal(summary.photos_skipped_limit, 1);
    assert.equal(summary.photos_failed, 0);
  });

  it('fetchRemotePhotoBuffer rechaza respuesta no ok', async () => {
    const result = await fetchRemotePhotoBuffer('https://cdn.example/missing.jpg', async () =>
      ({
        ok: false,
        status: 404,
        headers: { get: () => null },
        arrayBuffer: async () => new ArrayBuffer(0),
      }) as unknown as Response,
    );
    assert.equal(result, null);
  });

  it('fetchRemotePhotoBuffer no accede a HTTP ni a direcciones privadas', async () => {
    let requests = 0;
    const fetchImpl = async () => {
      requests += 1;
      return { ok: true } as Response;
    };
    const lookupAddresses = async (hostname: string) =>
      hostname === '127.0.0.1' ? ['127.0.0.1'] : ['203.0.113.10'];

    assert.equal(await fetchRemotePhotoBuffer('http://public.example/photo.jpg', fetchImpl, lookupAddresses), null);
    assert.equal(await fetchRemotePhotoBuffer('https://127.0.0.1/photo.jpg', fetchImpl, lookupAddresses), null);
    assert.equal(requests, 0);
  });

  it('fetchRemotePhotoBuffer valida las redirecciones y limita sus saltos', async () => {
    let requests = 0;
    const fetchImpl = async (requestUrl: Parameters<typeof fetch>[0]) => {
      requests += 1;
      return {
        ok: false,
        status: 302,
        headers: { get: (name: string) => (name === 'location' ? `${String(requestUrl)}/next` : null) },
      } as unknown as Response;
    };
    const lookupAddresses = async () => ['203.0.113.10'];

    assert.equal(
      await fetchRemotePhotoBuffer('https://cdn.example/photo.jpg', fetchImpl, lookupAddresses),
      null,
    );
    assert.equal(requests, 4);
  });

  it('DIARY_IMPORT_MAX_PHOTOS_RESTORE es razonable', () => {
    assert.ok(DIARY_IMPORT_MAX_PHOTOS_RESTORE >= 50);
  });
});

import { expect, test } from '@playwright/test';
import { API_BASE, openAuthenticatedHome, readAccessToken } from '../helpers/auth';

type CapsuleSummary = { id: string; match_id: number; liked_by_me?: boolean };

test.describe('Smoke — likes y comentarios @smoke', () => {
  test('API like y comentario en capsule propia', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE}/api/capsules/me?limit=1&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const body = (await me.json()) as { capsules?: CapsuleSummary[] };
    const capsule = body.capsules?.[0];
    if (!capsule?.id) {
      test.skip(true, 'La cuenta QA no tiene Capsules para probar likes/comentarios');
      return;
    }

    const like = await request.post(`${API_BASE}/api/capsules/${capsule.id}/like`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([201, 409]).toContain(like.status());

    const unlike = await request.delete(`${API_BASE}/api/capsules/${capsule.id}/like`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([204, 404]).toContain(unlike.status());

    const note = `E2E comentario ${Date.now()}`;
    const comment = await request.post(`${API_BASE}/api/capsules/${capsule.id}/comments`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { body: note },
    });
    expect(comment.status()).toBe(201);
    const created = (await comment.json()) as { id?: string; body?: string; parent_id?: string | null };
    expect(created.id).toBeTruthy();
    expect(created.body).toBe(note);
    expect(created.parent_id == null).toBe(true);

    const replyNote = `E2E reply ${Date.now()}`;
    const reply = await request.post(`${API_BASE}/api/capsules/${capsule.id}/comments`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { body: replyNote, parent_id: created.id },
    });
    expect(reply.status()).toBe(201);
    const replyBody = (await reply.json()) as { id?: string; body?: string; parent_id?: string | null };
    expect(replyBody.id).toBeTruthy();
    expect(replyBody.parent_id).toBe(created.id);

    const nested = await request.post(`${API_BASE}/api/capsules/${capsule.id}/comments`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { body: 'demasiado profundo', parent_id: replyBody.id },
    });
    expect(nested.status()).toBe(400);

    const list = await request.get(`${API_BASE}/api/capsules/${capsule.id}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok()).toBeTruthy();
    const commentsBody = (await list.json()) as {
      comments?: Array<{ id: string; body: string; parent_id?: string | null }>;
    };
    expect(commentsBody.comments?.some((c) => c.id === created.id)).toBe(true);
    expect(commentsBody.comments?.some((c) => c.id === replyBody.id && c.parent_id === created.id)).toBe(
      true,
    );

    const editedNote = `E2E editado ${Date.now()}`;
    const patch = await request.patch(
      `${API_BASE}/api/capsules/${capsule.id}/comments/${created.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { body: editedNote },
      },
    );
    expect(patch.status()).toBe(200);
    const patched = (await patch.json()) as { body?: string; edited_at?: string | null };
    expect(patched.body).toBe(editedNote);
    expect(patched.edited_at).toBeTruthy();

    const del = await request.delete(
      `${API_BASE}/api/capsules/${capsule.id}/comments/${created.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(del.status()).toBe(204);

    const listAfter = await request.get(`${API_BASE}/api/capsules/${capsule.id}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listAfter.ok()).toBeTruthy();
    const after = (await listAfter.json()) as { comments?: Array<{ id: string }> };
    expect(after.comments?.some((c) => c.id === created.id)).toBe(false);
    expect(after.comments?.some((c) => c.id === replyBody.id)).toBe(false);
  });

  test('UI like y comentario en detalle de Capsule', async ({ page, request }) => {
    await openAuthenticatedHome(page);
    const token = await readAccessToken(page);
    expect(token).toBeTruthy();

    const me = await request.get(`${API_BASE}/api/capsules/me?limit=1&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(me.ok()).toBeTruthy();
    const body = (await me.json()) as { capsules?: CapsuleSummary[] };
    const capsule = body.capsules?.[0];
    if (!capsule?.id) {
      test.skip(true, 'La cuenta QA no tiene Capsules para probar likes/comentarios UI');
      return;
    }

    await page.route('**/api/capsules/*/likes/following', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          people: [
            {
              id: 'e2e-friend',
              username: 'amigo_e2e',
              display_name: 'Amigo E2E',
              avatar_url: null,
            },
          ],
          total: 1,
        },
      });
    });

    await page.route('**/api/capsules/*/comments/following', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          people: [
            {
              id: 'e2e-commenter',
              username: 'comentarista_e2e',
              display_name: 'Comentarista E2E',
              avatar_url: null,
            },
          ],
          total: 1,
        },
      });
    });

    await page.goto(`/c/${capsule.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/también le gusta/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /amigo e2e/i })).toBeVisible();
    await expect(page.getByText(/también comentó/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /comentarista e2e/i })).toBeVisible();

    const likeBtn = page.getByRole('button', { name: /me gusta/i }).first();
    await expect(likeBtn).toBeVisible();
    const wasLiked = (await likeBtn.getAttribute('aria-pressed')) === 'true';
    await likeBtn.click();
    await expect(likeBtn).toHaveAttribute('aria-pressed', wasLiked ? 'false' : 'true');

    const note = `E2E UI comentario ${Date.now()}`;
    await page.getByRole('button', { name: /comentar|comentarios/i }).first().click();
    await expect(page.getByLabel(/nuevo comentario/i)).toBeVisible();
    await page.getByLabel(/nuevo comentario/i).fill(note);
    await page.getByRole('button', { name: /^publicar$/i }).click();
    await expect(page.getByText(note)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /ocultar comentarios/i }).click();
    const commentsToggle = page.getByRole('button', { name: /\d+ comentarios?/i }).first();
    await expect(commentsToggle).toBeVisible();
    await expect(commentsToggle).toHaveAttribute('aria-expanded', 'false');

    await commentsToggle.click();
    const posted = page.getByText(note);
    await expect(posted).toBeVisible();
    await posted
      .locator('xpath=ancestor::li[1]')
      .getByRole('button', { name: /^borrar comentario$/i })
      .click();
    const dialog = page.getByRole('dialog', { name: /borrar este comentario/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^borrar$/i }).click();
    await expect(dialog).toBeHidden();
    await expect(posted).toBeHidden({ timeout: 15_000 });
  });
});

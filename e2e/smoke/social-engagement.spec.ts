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
    const created = (await comment.json()) as { id?: string; body?: string };
    expect(created.id).toBeTruthy();
    expect(created.body).toBe(note);

    const list = await request.get(`${API_BASE}/api/capsules/${capsule.id}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(list.ok()).toBeTruthy();
    const commentsBody = (await list.json()) as { comments?: Array<{ id: string; body: string }> };
    expect(commentsBody.comments?.some((c) => c.id === created.id)).toBe(true);

    const del = await request.delete(
      `${API_BASE}/api/capsules/${capsule.id}/comments/${created.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(del.status()).toBe(204);
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

    await page.goto(`/c/${capsule.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });

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
    await expect(page.getByRole('button', { name: /\d+ comentarios/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /\d+ comentarios/i }).first().click();
    await page.getByRole('button', { name: /^borrar comentario$/i }).first().click();
    const dialog = page.getByRole('dialog', { name: /borrar este comentario/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^borrar$/i }).click();
    await expect(page.getByText(note)).toBeHidden({ timeout: 15_000 });
  });
});

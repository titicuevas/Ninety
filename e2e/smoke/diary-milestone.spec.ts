import { expect, test, type Page } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

async function readSessionUserId(page: Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('ninety.session:v1') ?? localStorage.getItem('ninety.session');
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as { user?: { id?: string } };
      return session.user?.id ?? null;
    } catch {
      return null;
    }
  });
}

function milestoneCapsule(opts: {
  id: string;
  userId: string;
  matchId: number;
  home: string;
  away: string;
  day: string;
}) {
  const iso = `${opts.day}T12:00:00.000Z`;
  return {
    id: opts.id,
    user_id: opts.userId,
    match_id: opts.matchId,
    match_played_at: iso,
    home_team_name: opts.home,
    away_team_name: opts.away,
    home_team_crest: null,
    away_team_crest: null,
    competition_name: 'La Liga',
    home_score: 1,
    away_score: 0,
    watched_at: opts.day,
    rating: 4,
    note: null,
    photo_urls: [] as string[],
    is_public: true,
    created_at: iso,
    updated_at: iso,
  };
}

/** Core onboarding oculto: perfil completo + ≥1 follow (hito solo si coreComplete). */
async function forceCoreComplete(page: Page, userId: string) {
  await page.evaluate((id) => {
    localStorage.setItem(
      `ninety.valueOnboarding:v1:${id}`,
      JSON.stringify({ dismissPermanent: true }),
    );
    localStorage.removeItem(`ninety.diaryAnniversary:v1:${id}`);
    localStorage.removeItem(`ninety.diaryMilestone:v1:${id}`);
    localStorage.removeItem(`ninety.diaryDigest:v1:${id}`);
  }, userId);

  await page.route('**/api/profile/me', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const res = await route.fetch();
    const body = (await res.json()) as {
      display_name?: string | null;
      username?: string | null;
      [key: string]: unknown;
    };
    const username = body.username ?? '';
    const auto = /^user_[a-f0-9]{8}$/i.test(username);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...body,
        display_name:
          typeof body.display_name === 'string' && body.display_name.length >= 2
            ? body.display_name
            : 'QA Demo',
        username: auto || !username ? 'qa_e2e_demo' : username,
      }),
    });
  });

  await page.route('**/api/profile/*/following**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: [{ username: 'rival_e2e', display_name: 'Rival E2E' }],
        total: 1,
        kind: 'following',
        username: 'qa_e2e_demo',
      }),
    });
  });
}

test.describe('Smoke — hitos del diario @smoke', () => {
  test('card de hito aparece, prioriza sobre digest y se puede dismiss', async ({ page }) => {
    await openAuthenticatedHome(page);
    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();

    await forceCoreComplete(page, userId!);

    const capsules = Array.from({ length: 5 }, (_, i) =>
      milestoneCapsule({
        id: `mile-e2e-${i + 1}`,
        userId: userId!,
        matchId: 9100 + i,
        home: 'Betis',
        away: `Rival${i + 1}`,
        day: `2026-01-${String(i + 1).padStart(2, '0')}`,
      }),
    );

    await page.route('**/api/capsules/me**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ capsules, total: capsules.length }),
      });
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: /primeros pasos/i })).toHaveCount(0);

    const card = page.getByTestId('diary-milestone-card');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByRole('heading', { name: /primeras 5 capsules/i })).toBeVisible();
    await expect(card.getByRole('link', { name: /ver mi diario/i })).toHaveAttribute(
      'href',
      '/capsules',
    );
    await expect(page.getByTestId('diary-digest-card')).toHaveCount(0);

    await card.getByRole('button', { name: /no volver a mostrar/i }).click();
    await expect(page.getByTestId('diary-milestone-card')).toHaveCount(0);
  });

  test('Ajustes expone preferencia de hitos', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/settings');
    await expect(page.getByTestId('diary-milestone-prefs')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/hitos del diario/i)).toBeVisible();
  });
});

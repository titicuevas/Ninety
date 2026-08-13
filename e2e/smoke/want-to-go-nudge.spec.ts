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

function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
}

function wantToGoItem(opts: {
  userId: string;
  matchId: number;
  home: string;
  away: string;
  hoursAhead: number;
}) {
  const iso = hoursFromNow(opts.hoursAhead);
  return {
    user_id: opts.userId,
    match_id: opts.matchId,
    match_played_at: iso,
    home_team_name: opts.home,
    away_team_name: opts.away,
    home_team_crest: null,
    away_team_crest: null,
    competition_name: 'La Liga',
    home_score: null,
    away_score: null,
    note: null,
    created_at: iso,
  };
}

/** Core onboarding oculto + dismiss de cards competidoras. */
async function forceCoreComplete(page: Page, userId: string) {
  await page.evaluate((id) => {
    localStorage.setItem(
      `ninety.valueOnboarding:v1:${id}`,
      JSON.stringify({ dismissPermanent: true }),
    );
    localStorage.removeItem(`ninety.diaryAnniversary:v1:${id}`);
    localStorage.removeItem(`ninety.diaryMilestone:v1:${id}`);
    localStorage.removeItem(`ninety.incompleteCapsule:v1:${id}`);
    localStorage.removeItem(`ninety.diaryDigest:v1:${id}`);
    localStorage.removeItem(`ninety.wantToGoNudge:v1:${id}`);
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

  // Capsules «completas» para no disparar incomplete / digest agresivo.
  await page.route('**/api/capsules/me**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const now = new Date().toISOString();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        capsules: [
          {
            id: 'cap-w2g-e2e-1',
            user_id: userId,
            match_id: 8001,
            match_played_at: now,
            home_team_name: 'Madrid',
            away_team_name: 'Barça',
            home_team_crest: null,
            away_team_crest: null,
            competition_name: 'La Liga',
            home_score: 1,
            away_score: 0,
            watched_at: now.slice(0, 10),
            rating: 5,
            note: 'Completa para e2e',
            photo_urls: ['https://example.com/p.jpg'],
            is_public: true,
            created_at: now,
            updated_at: now,
          },
        ],
        total: 1,
      }),
    });
  });
}

test.describe('Smoke — soft nudge Quiero ir @smoke', () => {
  test('card aparece con partido cercano, prioriza sobre digest y se puede dismiss', async ({
    page,
  }) => {
    await openAuthenticatedHome(page);
    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();

    await forceCoreComplete(page, userId!);

    await page.route('**/api/want-to-go/me**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const url = route.request().url();
      // Lista completa (no solo ids).
      if (url.includes('/ids')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ match_ids: [9101] }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            wantToGoItem({
              userId: userId!,
              matchId: 9101,
              home: 'Betis',
              away: 'Sevilla',
              hoursAhead: 8,
            }),
          ],
          total: 1,
          limit: 100,
          offset: 0,
        }),
      });
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: /primeros pasos/i })).toHaveCount(0);

    const card = page.getByTestId('want-to-go-nudge-card');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByRole('heading', { name: /partido cerca en quiero ir/i })).toBeVisible();
    await expect(card.getByText(/Betis–Sevilla/i)).toBeVisible();
    await expect(card.getByRole('link', { name: /ver lista/i })).toHaveAttribute(
      'href',
      '/want-to-go',
    );
    await expect(page.getByTestId('diary-digest-card')).toHaveCount(0);

    await card.getByRole('button', { name: /no volver a mostrar/i }).click();
    await expect(page.getByTestId('want-to-go-nudge-card')).toHaveCount(0);
  });

  test('Ajustes expone preferencia de card Quiero ir', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/settings');
    await expect(page.getByTestId('want-to-go-push-prefs')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/recordatorio quiero ir/i)).toBeVisible();
    await expect(page.getByText(/card en inicio/i)).toBeVisible();
  });
});

import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

async function readSessionUserId(page: import('@playwright/test').Page) {
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

/** Fecha local YYYY-MM-DD (contrato de watched_at en Capsules). */
function localDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function anniversaryCapsule(opts: {
  id: string;
  userId: string;
  matchId: number;
  home: string;
  away: string;
  yearsAgo: number;
  rating?: number;
  note?: string | null;
}) {
  const now = new Date();
  const past = new Date(now.getFullYear() - opts.yearsAgo, now.getMonth(), now.getDate(), 12, 0, 0);
  const day = localDateOnly(past);
  const iso = past.toISOString();
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
    watched_at: day,
    rating: opts.rating ?? 5,
    note: opts.note ?? null,
    photo_urls: [] as string[],
    is_public: true,
    created_at: iso,
    updated_at: iso,
  };
}

test.describe('Smoke — aniversarios del diario @smoke', () => {
  test('card Tal día como hoy aparece, prioriza sobre digest y se puede dismiss', async ({
    page,
  }) => {
    await openAuthenticatedHome(page);
    const userId = await readSessionUserId(page);
    expect(userId).toBeTruthy();

    const onboardingCore = page.getByRole('heading', { name: /primeros pasos/i });
    if (await onboardingCore.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'note',
        description: 'Onboarding core activo — aniversario no aplica',
      });
      test.skip();
      return;
    }

    await page.evaluate((id) => {
      localStorage.setItem(
        `ninety.valueOnboarding:v1:${id}`,
        JSON.stringify({ dismissPermanent: true }),
      );
      localStorage.removeItem(`ninety.diaryAnniversary:v1:${id}`);
      localStorage.removeItem(`ninety.diaryDigest:v1:${id}`);
    }, userId!);

    await page.route('**/api/capsules/me**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          capsules: [
            anniversaryCapsule({
              id: 'anni-e2e-1',
              userId: userId!,
              matchId: 9001,
              home: 'Betis',
              away: 'Sevilla',
              yearsAgo: 2,
              rating: 5,
              note: 'Derbi e2e',
            }),
          ],
          total: 1,
        }),
      });
    });

    await page.reload();

    const card = page.getByTestId('diary-anniversary-card');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card.getByRole('heading', { name: /tal día como hoy/i })).toBeVisible();
    await expect(card.getByRole('link', { name: /revivir capsule/i })).toHaveAttribute(
      'href',
      '/c/anni-e2e-1',
    );
    await expect(page.getByTestId('diary-digest-card')).toHaveCount(0);

    await card.getByRole('button', { name: /no volver a mostrar/i }).click();
    await expect(page.getByTestId('diary-anniversary-card')).toHaveCount(0);
  });

  test('Ajustes expone preferencia de aniversarios', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/settings');
    await expect(page.getByTestId('diary-anniversary-prefs')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/aniversarios del diario/i)).toBeVisible();
  });
});

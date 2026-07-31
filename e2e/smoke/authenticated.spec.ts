import { expect, test } from '@playwright/test';
import { openAuthenticatedHome } from '../helpers/auth';

test.describe('Smoke — autenticado @smoke', () => {
  test('home muestra Wrapped o empty state', async ({ page }) => {
    await openAuthenticatedHome(page);
    await expect(
      page.getByRole('heading', { name: /esto es tu fútbol|tu wrapped empieza/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('home muestra hub Comunidad con atajos', async ({ page }) => {
    await openAuthenticatedHome(page);
    await expect(page.getByRole('heading', { name: /^comunidad$/i })).toBeVisible({
      timeout: 20_000,
    });
    const shortcuts = page.getByRole('navigation', { name: /atajos sociales/i });
    await expect(shortcuts.getByRole('link', { name: /^feed$/i })).toBeVisible();
    await expect(shortcuts.getByRole('link', { name: /aficionados/i })).toBeVisible();
    await expect(shortcuts.getByRole('link', { name: /notificaciones/i })).toBeVisible();
  });

  test('Wrapped permite cambiar periodo y compartir', async ({ page }) => {
    await openAuthenticatedHome(page);
    const wrappedHeading = page.getByRole('heading', { name: /esto es tu fútbol/i });
    const empty = page.getByRole('heading', { name: /tu wrapped empieza/i });
    await expect(wrappedHeading.or(empty)).toBeVisible({ timeout: 20_000 });

    if (await empty.isVisible().catch(() => false)) return;

    const tabs = page.getByRole('tablist', { name: /periodo del wrapped/i });
    await expect(tabs).toBeVisible();
    const allTab = tabs.getByRole('tab', { name: /^todo$/i });
    await allTab.click();
    await expect(page).toHaveURL(/wrapped=all/);
    const shareBtn = page.getByRole('button', { name: /compartir wrapped|compartir|copiado|resumen copiado/i });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();
    // Web Share / clipboard / fallback manual: el CTA no debe romper
    await expect(
      page
        .getByRole('button', { name: /compartir wrapped|compartir|copiado|resumen copiado/i })
        .or(page.getByLabel(/texto del wrapped para copiar/i)),
    ).toBeVisible();

    // Collage, estadio o gráfico mensual si hay datos; el hero siempre tiene media ★
    await expect(page.getByText(/^media ⭐$/i).first()).toBeVisible();
    const collage = page.getByRole('img', { name: /fotos de tus partidos/i });
    const stadiumChip = page.getByText(/^en estadio$/i);
    const monthChart = page.getByLabel(/gráfico de partidos por mes/i);
    await expect(collage.or(stadiumChip).or(monthChart).or(page.getByText(/media ⭐/i).first())).toBeVisible();
  });

  test('feed accesible desde la app', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /feed/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/feed/);
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();
  });

  test('Buscar partidos muestra chips de temporada', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /buscar/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('heading', { name: /^buscar$/i })).toBeVisible();

    await page.getByLabel(/equipo o rival/i).fill('Betis');
    await expect(page.getByRole('group', { name: /temporada/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /^cualquiera$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /esta temporada/i })).toBeVisible();

    await page.getByRole('button', { name: /esta temporada/i }).click();
    await expect(page).toHaveURL(/season=/);
  });

  test('Buscar partidos ofrece atajo de equipo favorito o perfil', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /buscar/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByText(/qué partido viste/i)).toBeVisible({
      timeout: 15_000,
    });

    const favoriteShortcut = page.getByRole('button', { name: /^buscar /i });
    const profileLink = page.getByRole('link', { name: /añadir equipo favorito/i });

    await expect(favoriteShortcut.or(profileLink)).toBeVisible();

    if (await favoriteShortcut.isVisible()) {
      await favoriteShortcut.click();
      await expect(page).toHaveURL(/\bq=/);
      await expect(page.getByLabel(/equipo o rival/i)).not.toHaveValue('');
      await expect(
        page
          .getByRole('status', { name: /buscando partidos/i })
          .or(page.locator('ul li').first())
          .or(page.getByText(/sin resultados/i))
          .or(page.getByRole('group', { name: /temporada/i })),
      ).toBeVisible({ timeout: 20_000 });
    }
  });

  test('Buscar aficionados muestra sugerencias o empty', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /buscar/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/search/);

    await page.getByRole('tab', { name: 'Aficionados' }).click();
    await expect(page).toHaveURL(/tab=people/);

    const suggestions = page.getByRole('heading', { name: /aficionados sugeridos/i });
    const emptyHint = page.getByText(/encuentra aficionados/i);
    await expect(suggestions.or(emptyHint)).toBeVisible({ timeout: 15_000 });
  });

  test('Mis Capsules pide confirmación al eliminar', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /capsules/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/capsules/);

    const deleteBtn = page.getByRole('button', { name: /^eliminar$/i }).first();
    const empty = page.getByText(/aún no tienes capsules/i);
    await expect(deleteBtn.or(empty)).toBeVisible({ timeout: 20_000 });
    if (await empty.isVisible().catch(() => false)) return;

    await deleteBtn.click();
    const dialog = page.getByRole('dialog', { name: /eliminar esta capsule/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/no se puede deshacer/i)).toBeVisible();
    await dialog.getByRole('button', { name: /^cancelar$/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('Editar Capsule pide confirmación al salir con cambios', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /capsules/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/capsules/);

    const editLink = page.getByRole('link', { name: /editar/i }).first();
    const empty = page.getByText(/aún no tienes capsules/i);
    await expect(editLink.or(empty)).toBeVisible({ timeout: 20_000 });
    if (await empty.isVisible().catch(() => false)) return;

    await editLink.click();
    await expect(page).toHaveURL(/\/capsules\/.+\/edit/);
    await expect(page.getByRole('heading', { name: /editar capsule/i })).toBeVisible();

    const note = page.getByLabel('Nota (opcional)');
    await note.fill(`Cambio sin guardar ${Date.now()}`);
    await page.getByRole('button', { name: /^cancelar$/i }).click();

    const dialog = page.getByRole('dialog', { name: /salir sin guardar/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/perderás los cambios/i)).toBeVisible();
    await dialog.getByRole('button', { name: /seguir editando/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/capsules\/.+\/edit/);

    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /^feed$/i })
      .first()
      .click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /seguir editando/i }).click();
    await expect(page).toHaveURL(/\/capsules\/.+\/edit/);
  });

  test('Editar Capsule muestra confirmación al guardar', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /capsules/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/capsules/);

    const editLink = page.getByRole('link', { name: /editar/i }).first();
    const empty = page.getByText(/aún no tienes capsules/i);
    await expect(editLink.or(empty)).toBeVisible({ timeout: 20_000 });
    if (await empty.isVisible().catch(() => false)) return;

    await editLink.click();
    await expect(page).toHaveURL(/\/capsules\/.+\/edit/);

    const note = page.getByLabel('Nota (opcional)');
    const stamp = `Guardado E2E ${Date.now()}`;
    await note.fill(stamp);
    await page.getByRole('button', { name: /guardar cambios/i }).click();

    await expect(page).toHaveURL(/\/c\/.+/, { timeout: 30_000 });
    await expect(page.getByRole('status').filter({ hasText: /cambios guardados/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('Perfil pide confirmación al salir con cambios', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /perfil/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /tu perfil/i })).toBeVisible({ timeout: 20_000 });

    const nameInput = page.getByLabel(/^nombre$/i);
    await nameInput.fill(`Nombre temporal ${Date.now()}`);

    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /^feed$/i })
      .first()
      .click();

    const dialog = page.getByRole('dialog', { name: /salir sin guardar/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/perderás los cambios de tu perfil/i)).toBeVisible();
    await dialog.getByRole('button', { name: /seguir editando/i }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/profile/);
  });
});

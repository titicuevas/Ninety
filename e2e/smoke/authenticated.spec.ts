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
    const teaserHeading = page.getByRole('heading', { name: /esto es tu fútbol/i });
    const empty = page.getByRole('heading', { name: /tu wrapped empieza/i });
    await expect(teaserHeading.or(empty)).toBeVisible({ timeout: 20_000 });

    if (await empty.isVisible().catch(() => false)) return;

    await page.getByRole('link', { name: /ver wrapped/i }).click();
    await expect(page).toHaveURL(/view=wrapped/);

    const wrappedHeading = page.getByRole('heading', { name: /esto es tu fútbol/i });
    await expect(wrappedHeading).toBeVisible({ timeout: 10_000 });

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
    await expect(
      collage.or(stadiumChip).or(monthChart).or(page.getByText(/media ⭐/i)).first(),
    ).toBeVisible();
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

  test('Buscar partidos muestra chips de temporada y mes', async ({ page }) => {
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
    await expect(page.getByRole('group', { name: /^mes$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^cualquier mes$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^mar$/i })).toBeVisible();

    await page.getByRole('button', { name: /esta temporada/i }).click();
    await expect(page).toHaveURL(/season=/);

    await page.getByRole('button', { name: /^mar$/i }).click();
    await expect(page).toHaveURL(/month=3/);
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
          .or(page.getByRole('group', { name: /temporada/i }))
          .first(),
      ).toBeVisible({ timeout: 20_000 });
    }
  });

  test('Buscar aficionados muestra sugerencias o empty', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page.goto('/search?tab=people');
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole('heading', { name: /^buscar$/i })).toBeVisible();

    const tabs = page.getByRole('tablist', { name: /tipo de búsqueda/i });
    await expect(tabs.getByRole('tab', { name: 'Aficionados' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel(/nombre o username/i)).toBeVisible({ timeout: 15_000 });

    const suggestions = page.getByRole('heading', { name: /aficionados sugeridos/i });
    const emptyHint = page.getByText(/encuentra aficionados/i);
    const loading = page.getByText(/cargando sugerencias/i);
    await expect(suggestions.or(emptyHint).or(loading)).toBeVisible({ timeout: 15_000 });
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 20_000 });
    }
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

  test('Perfil comprueba disponibilidad de username', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /perfil/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /tu perfil/i })).toBeVisible({ timeout: 20_000 });

    const username = page.getByPlaceholder(/henry_madridista/i);
    await username.fill(`zzzninety_${Date.now().toString().slice(-6)}`);
    await expect(page.getByRole('status').filter({ hasText: /disponible|comprobando/i })).toBeVisible({
      timeout: 10_000,
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

  test('Ajustes accesible desde perfil', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /perfil/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: /tu perfil/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('link', { name: /^ajustes$/i }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: /^ajustes$/i })).toBeVisible();
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /guardar contraseña/i })).toBeVisible();

    const pushPanel = page.getByTestId('push-alerts-panel');
    await expect(pushPanel).toBeVisible();
    await expect(pushPanel.getByText('Alertas push', { exact: true })).toBeVisible();
    await expect(
      pushPanel
        .getByRole('button', { name: /activar alertas|enviar prueba|desactivar alertas/i })
        .or(page.getByTestId('push-diagnostics'))
        .or(
          pushPanel.getByText(
            /no soporta alertas push|aún no están disponibles|permiso está bloqueado/i,
          ),
        ),
    ).toBeVisible({ timeout: 15_000 });

    const typePrefs = page.getByTestId('notification-type-prefs');
    await expect(typePrefs).toBeVisible();
    await expect(typePrefs.getByText('Alertas por tipo', { exact: true })).toBeVisible();
    await expect(typePrefs.getByRole('button', { name: /me gusta/i })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByRole('link', { name: /ver centro de alertas/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /exportar e importar diario/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /descargar json/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /descargar csv/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /importar json/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /instalar ninety/i })).toBeVisible();
    await expect(page.locator('main').getByRole('button', { name: /^cerrar sesión$/i })).toBeVisible();
  });

  test('Ajustes ofrece eliminar cuenta por email', async ({ page }) => {
    await openAuthenticatedHome(page);
    await page
      .getByRole('navigation', { name: /navegación principal/i })
      .getByRole('link', { name: /perfil/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/profile/);
    await page.getByRole('link', { name: /^ajustes$/i }).click();
    await expect(page).toHaveURL(/\/settings/);

    await page.getByRole('button', { name: /eliminar cuenta/i }).click();
    const dialog = page.getByRole('dialog', { name: /eliminar cuenta/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/hello@ninety\.app/i)).toBeVisible();

    const confirmEmail = dialog.getByLabel(/confirmar email para eliminar cuenta/i);
    await expect(confirmEmail).toBeVisible();
    await expect(dialog.getByRole('button', { name: /escribir email/i })).toBeDisabled();

    const emailValue = await page.locator('main input[type="email"][disabled]').inputValue();
    await confirmEmail.fill(emailValue || 'test@example.com');
    await expect(dialog.getByRole('button', { name: /escribir email/i })).toBeEnabled();

    await dialog.getByRole('button', { name: /^cerrar$/i }).click();
    await expect(dialog).toBeHidden();
  });
});

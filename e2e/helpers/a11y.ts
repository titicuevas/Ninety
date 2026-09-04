import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** El foco debe estar dentro del diálogo abierto (trap de `<dialog showModal>`). */
export async function expectFocusInsideOpenDialog(page: Page) {
  const inside = await page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    const active = document.activeElement;
    return !!dialog && !!active && dialog.contains(active);
  });
  expect(inside, 'el foco debe estar dentro del diálogo abierto').toBe(true);
}

/** Auditoría WCAG 2.0/2.1 A/AA con Axe. No oculta impactos moderados. */
export async function expectNoA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect
    .soft(
      results.violations,
      `A11y (${label}): ${results.violations.map((v) => v.id).join(', ') || 'ok'}`,
    )
    .toEqual([]);

  if (results.violations.length > 0) {
    const detail = results.violations
      .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodos)`)
      .join('\n');
    throw new Error(`Violaciones a11y en ${label}:\n${detail}`);
  }
}

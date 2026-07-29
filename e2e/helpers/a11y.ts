import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Auditoría WCAG 2 A/AA con axe. Falla el test si hay violaciones. */
export async function expectNoA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );

  expect
    .soft(serious, `A11y (${label}): ${serious.map((v) => v.id).join(', ') || 'ok'}`)
    .toEqual([]);

  if (serious.length > 0) {
    const detail = serious
      .map((v) => `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodos)`)
      .join('\n');
    throw new Error(`Violaciones a11y en ${label}:\n${detail}`);
  }
}

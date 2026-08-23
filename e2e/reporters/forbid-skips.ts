import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export default class ForbidSkipsReporter implements Reporter {
  private readonly skipped = new Set<string>();

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'skipped') {
      this.skipped.add(test.titlePath().join(' › '));
    }
  }

  onEnd(result: FullResult) {
    if (this.skipped.size === 0) return;

    console.error(`\nQA autenticado incompleto: ${this.skipped.size} prueba(s) omitida(s):`);
    for (const title of this.skipped) console.error(`- ${title}`);
    console.error('Corrige los datos o la infraestructura requeridos; un skip no cuenta como cobertura.');

    return { status: 'failed' as const };
  }
}

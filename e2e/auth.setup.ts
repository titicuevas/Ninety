import { expect, test as setup } from '@playwright/test';
import { loginAsDemo } from './helpers/auth';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const authFile = path.join('e2e', '.auth', 'user.json');

setup('autenticar usuario QA', async ({ page }) => {
  mkdirSync(path.dirname(authFile), { recursive: true });
  await loginAsDemo(page);
  await expect(page.getByRole('heading', { name: /esto es tu fútbol|tu wrapped empieza/i })).toBeVisible({
    timeout: 20_000,
  });
  await page.context().storageState({ path: authFile });
});

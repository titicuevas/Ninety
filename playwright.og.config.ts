import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), 'backend/.env') });

const siteURL = 'http://localhost:4173';
process.env.E2E_SITE_URL = siteURL;
const apiURL = process.env.E2E_API_URL ?? 'https://ninety-api.up.railway.app';
process.env.E2E_API_URL = apiURL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: siteURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'og-local',
      testMatch: /smoke\/public\.spec\.ts/,
      grep: /OG /,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `env PORT=4173 API_URL=${apiURL} SITE_URL=${siteURL} npm start --prefix frontend`,
      url: `${siteURL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});

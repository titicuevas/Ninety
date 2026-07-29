import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), 'backend/.env') });

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const authFile = 'e2e/.auth/user.json';

/**
 * Proyectos QE:
 * - setup: login + storageState
 * - smoke-public / a11y: sin auth (CI-friendly)
 * - chromium / mobile: flujos autenticados + críticos
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'smoke-public',
      testMatch: /smoke\/public\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'a11y',
      testMatch: /a11y\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testMatch: /smoke\/authenticated\.spec\.ts|critical\/(people-search|follow-lists)\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
    {
      name: 'mobile',
      testMatch: /critical\/mobile-nav\.spec\.ts|smoke\/authenticated\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 5'],
        storageState: authFile,
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

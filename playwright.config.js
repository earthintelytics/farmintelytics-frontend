// @ts-check
import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for FarmIntelytics Portal Smoke Tests (T43).
 *
 * Usage:
 *   # Run against local preview or dev server:
 *   npx playwright test
 *
 *   # Run against remote demo server:
 *   PORTAL_BASE_URL="https://demo.farmintelytics.com" npx playwright test
 */
const baseURL = process.env.PORTAL_BASE_URL || 'http://localhost:4173';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile-iphone',
      use: {
        viewport: { width: 390, height: 844 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.PORTAL_BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --port 4173',
        port: 4173,
        reuseExistingServer: true,
        timeout: 45000,
      },
});

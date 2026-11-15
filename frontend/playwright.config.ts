/**
 * Playwright Configuration for PricePilot AI
 * End-to-end tests for all 13 application pages
 */
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  expect: {
    timeout: 5000,
  },
  // Run tests in files in parallel
  fullyParallel: true,
  // Workers allow tests to run in parallel
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  // Configure test timeout
  use: {
    baseURL: 'http://localhost:5173',
    browser: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // Trace enable
    trace: 'on-first-retry',
  },
  
  // Project-specific configurations
  projects: [
    {
      name: 'Chromium',
      use: {
        ...DEFAULT_USE_CONFIG,
        browser: 'chromium',
      },
    },
    {
      name: 'Firefox',
      use: {
        ...DEFAULT_USE_CONFIG,
        browser: 'firefox',
      },
    },
    {
      name: 'WebKit',
      use: {
        ...DEFAULT_USE_CONFIG,
        browser: 'webkit',
      },
    },
  ],
});
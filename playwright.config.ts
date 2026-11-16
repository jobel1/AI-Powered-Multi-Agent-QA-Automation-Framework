
import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({

  testDir: './src/tests',

  outputDir: 'test-results',

  // Maximum duration for the complete test run
  globalTimeout: 35 * 60 * 1000,

  // Run tests in a predictable order
  fullyParallel: false,

  // Prevent accidental test.only in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests only in CI
  retries: process.env.CI ? 1 : 0,

  // Use one worker to avoid concurrent test execution
  workers: 1,

  reporter: [
    ['list'],
    ['html', {
      outputFolder: 'playwright-report',
      open: 'never'
    }]
  ],

  use: {
    headless: !!process.env.CI,

    screenshot: 'only-on-failure',

    trace: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',

      use: {
        ...devices['Desktop Chrome']
      }
    }
  ]

});

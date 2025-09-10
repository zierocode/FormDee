import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable head mode for debugging when PLAYWRIGHT_HEAD=true
        headless: process.env.PLAYWRIGHT_HEAD !== 'true',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        // Add slow motion for head mode to better observe actions
        launchOptions: {
          slowMo: process.env.PLAYWRIGHT_HEAD === 'true' ? 100 : 0,
        }
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        headless: process.env.PLAYWRIGHT_HEAD !== 'true',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        launchOptions: {
          slowMo: process.env.PLAYWRIGHT_HEAD === 'true' ? 100 : 0,
        }
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        headless: process.env.PLAYWRIGHT_HEAD !== 'true',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        launchOptions: {
          slowMo: process.env.PLAYWRIGHT_HEAD === 'true' ? 100 : 0,
        }
      },
    },

    /* Note: Mobile testing limited to form renderer pages only
       Most of the app (builder, admin) is desktop-only */

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
        headless: process.env.PLAYWRIGHT_HEAD !== 'true',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        launchOptions: {
          slowMo: process.env.PLAYWRIGHT_HEAD === 'true' ? 100 : 0,
        }
      },
    },
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'], 
        channel: 'chrome',
        headless: process.env.PLAYWRIGHT_HEAD !== 'true',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        launchOptions: {
          slowMo: process.env.PLAYWRIGHT_HEAD === 'true' ? 100 : 0,
        }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global test timeout */
  timeout: 30000,
  /* Global expect timeout */
  expect: {
    timeout: 5000,
  },

  /* Output directories */
  outputDir: 'test-results/',
})
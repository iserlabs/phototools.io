import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3200',
    // Trace the first run and keep it only if that run fails, so a flaky test
    // (fails, then passes on retry) still leaves a trace of the failure.
    trace: 'retain-on-first-failure',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(process.env.CI
      ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }]
      : []),
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3200',
    reuseExistingServer: !process.env.CI,
  },
})

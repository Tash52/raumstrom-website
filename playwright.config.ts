import { defineConfig, devices } from '@playwright/test';

// E2E against the production build served by server/server.mjs.
// Build first: npm run build:staging (identical Astro build, launch check relaxed).
const PORT = 4399;
const TEST_SECRET = 'e2e-only-0123456789abcdef0123456789abcdef';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node server/server.mjs',
    url: `http://127.0.0.1:${PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      HOST: '127.0.0.1',
      PORT: String(PORT),
      ALTCHA_HMAC_KEY: TEST_SECRET,
      CSRF_SECRET: TEST_SECRET,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1025',
      SMTP_SECURE: 'false',
      SMTP_USER: 'e2e',
      SMTP_PASS: 'e2e-password',
      MAIL_FROM: 'anfrage@raumstrom.de',
    },
  },
});

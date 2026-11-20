import { defineConfig, devices } from '@playwright/test';
import { MAILPIT_SMTP_PORT, TEST_EMPFAENGER, mailpitZertifikat } from './tests/e2e/mailpit/umgebung.ts';
import { AUSGABE, BASE_URL, DIST, LAUF_ID, PORT } from './tests/e2e/lauf.ts';

// E2E against the production build served by server/server.mjs.
// Build first: npm run build:staging (identical Astro build, launch check relaxed).
// Port, run ID and build copy per run: tests/e2e/lauf.ts (E2E_PORT, E2E_DIST).
const TEST_SECRET = 'e2e-only-0123456789abcdef0123456789abcdef';
// Mailpit (Docker) for the contact form, started in globalSetup; STARTTLS with a throwaway test CA.
const { cert: MAILPIT_CA } = mailpitZertifikat();

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: AUSGABE,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
  globalSetup: './tests/e2e/mailpit/global-setup.ts',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node server/server.mjs',
    // Only our own server answers 200 for this run ID (a foreign one answers 409 = not ready),
    // so a run never reuses or waits on the server of another run.
    url: `${BASE_URL}/healthz?lauf=${LAUF_ID}`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      HOST: '127.0.0.1',
      PORT: String(PORT),
      RAUMSTROM_LAUF_ID: LAUF_ID,
      RAUMSTROM_DIST: DIST,
      ALTCHA_HMAC_KEY: TEST_SECRET,
      CSRF_SECRET: TEST_SECRET,
      // Lets the contact tests use their own X-Forwarded-For per test, so the per-client rate limit
      // (in memory) does not hit the shared 127.0.0.1. Production default stays false.
      TRUST_PROXY: 'true',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(MAILPIT_SMTP_PORT),
      SMTP_SECURE: 'false',
      SMTP_USER: 'e2e',
      SMTP_PASS: 'e2e-password',
      MAIL_FROM: 'anfrage@raumstrom.de',
      MAIL_TO_STAGING: TEST_EMPFAENGER,
      NODE_EXTRA_CA_CERTS: MAILPIT_CA,
    },
  },
});

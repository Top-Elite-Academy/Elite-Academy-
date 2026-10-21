import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const MOCK_API_PORT = 4100;

/**
 * End-to-end tests against the production build (`pnpm build` first).
 * Public content comes from e2e/mock-api.mjs, so no database is needed.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: 'node e2e/mock-api.mjs',
      url: `http://127.0.0.1:${MOCK_API_PORT}/api/health`,
      env: { MOCK_API_PORT: String(MOCK_API_PORT) },
      reuseExistingServer: !process.env['CI'],
    },
    {
      command: `pnpm exec next start --port ${PORT}`,
      url: `http://localhost:${PORT}/en`,
      env: { API_INTERNAL_URL: `http://127.0.0.1:${MOCK_API_PORT}` },
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});

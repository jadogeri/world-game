import { defineConfig } from '@playwright/test';

// Run on port 4000 to match your app's frontend configuration
const PORT = 4000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.e2e.test.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  // Only boot the frontend Vite app. The API server is completely bypassed.
  webServer: {
    command: `pnpm run dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

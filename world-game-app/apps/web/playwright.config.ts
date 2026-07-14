import { defineConfig } from '@playwright/test';

// A fixed, unlikely-to-collide port for the standalone dev server this suite
// spins up. It intentionally does NOT reuse the artifact's workflow-assigned
// PORT/BASE_PATH so `pnpm test:e2e` also works outside the Replit workflow.
const PORT = 4173;
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
  webServer: {
    command: 'pnpm run dev',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      BASE_PATH: '/',
    },
  },
});

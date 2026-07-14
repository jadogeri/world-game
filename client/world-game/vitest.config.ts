import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Split into "unit" and "integration" projects (Vitest 3's replacement for
// vitest.workspace.ts) so `pnpm test:unit` / `pnpm test:integration` can run
// independently, mirroring api-server's separate suites.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['test/unit/**/*.unit.test.{ts,tsx}'],
          setupFiles: ['./test/setup.ts'],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'jsdom',
          include: ['test/integration/**/*.integration.test.{ts,tsx}'],
          setupFiles: ['./test/setup.ts'],
          restoreMocks: true,
        },
      },
    ],
  },
});

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
    // =========================================================================
    // 🟢 FIXED: BUNDLER-LEVEL DEPENDENCY DEDUPLICATION
    // This forces Vite and Vitest to treat React and React-DOM as singletons.
    // Every external monorepo package (like @repo/api-client-react) is strictly
    // forced to share the web project's exact local React instance. This kills
    // the dual-React version collision without breaking your unit test setup.
    // =========================================================================
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true,

    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          include: ['./test/unit/**/*.unit.test.{ts,tsx}'],
          setupFiles: ['./test/setup.ts'],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          globals: true,
          environment: 'jsdom',
          include: ['./test/integration/**/*.integration.test.{ts,tsx}'],
          setupFiles: ['./test/setup.ts'],
          restoreMocks: true,
        },
      },
    ],
  },
});

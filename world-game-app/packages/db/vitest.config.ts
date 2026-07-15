import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Searches strictly inside your standalone package test directory block
    include: ['test/**/*.test.ts'],
  },
});

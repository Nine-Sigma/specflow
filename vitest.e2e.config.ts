import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/mcp/__tests__/**/*.test.ts'],
    testTimeout: 30_000,
    pool: 'forks',
    globals: false,
    globalSetup: ['src/mcp/__tests__/metrics/global-teardown.ts'],
    teardownTimeout: 10_000,
  },
});

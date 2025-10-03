import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    threads: false,
    singleThread: true,
    coverage: {
      reporter: ['text', 'lcov'],
      provider: 'v8',
    },
  },
});

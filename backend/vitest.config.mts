import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: './tests/globalSetup.ts',
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false, // los tests de integración comparten una sola BD de test
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});

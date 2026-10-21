import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Integration tests: run the real app against the Docker Postgres + Redis,
// using a separate test database and Redis db (see test/setup/global-setup.ts).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.int.test.ts'],
    globalSetup: ['test/setup/global-setup.ts'],
    setupFiles: ['test/setup/env.ts'],
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});

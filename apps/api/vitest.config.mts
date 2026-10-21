import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Unit tests: fast, no database or Redis needed.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.test.ts'],
  },
});

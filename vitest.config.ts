import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Vitest runs unit tests only (*.test.ts). Playwright specs under
    // tests/load/ use *.spec.ts and run via `npm run test:e2e` — if Vitest
    // picks them up it throws "Playwright Test did not expect test.describe()".
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['tests/load/**', 'node_modules/**', '.next/**', 'dist/**'],
    environment: 'node',
  },
  resolve: {
    // Mirror the "@/..." path alias from tsconfig so unit tests can import it.
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
});

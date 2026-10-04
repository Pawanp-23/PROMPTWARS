import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    root: '.',
    include: ['server/tests/**/*.test.ts', 'client/src/tests/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['server/**/*.ts', 'shared/**/*.ts', 'client/src/**/*.{ts,tsx}'],
      exclude: ['**/tests/**', 'server/index.ts', 'client/src/main.tsx'],
    },
  },
});

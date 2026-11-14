import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // The real ledger package computes hashes with node:crypto, which is
      // unavailable in the browser. Browser flows delegate hashing/appends to
      // the server (POST /api/ledger/append) via the browser-safe stub.
      '@graft/ledger': resolve(__dirname, './src/stubs/ledger.ts'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        // Main process entry
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: [
                'better-sqlite3',
                'music-metadata',
                'node-id3',
                'electron',
                'electron-updater',
                '@xhayper/discord-rpc',
                'bufferutil',
                'utf-8-validate',
              ],
              output: {
                entryFileNames: 'index.js',
              },
            },
          },
        },
      },
      {
        // Preload script (CommonJS)
        entry: 'src/preload/index.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            lib: {
              entry: 'src/preload/index.ts',
              formats: ['cjs'],
              fileName: () => 'index.cjs',
            },
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        // Scanner worker thread
        entry: 'src/main/scanner/scanner-worker.ts',
        vite: {
          build: {
            outDir: 'dist-electron/scanner',
            rollupOptions: {
              external: [
                'better-sqlite3',
                'music-metadata',
                'node-id3',
                'electron',
                '@xhayper/discord-rpc',
                'bufferutil',
                'utf-8-validate',
              ],
              output: {
                entryFileNames: 'scanner-worker.js',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'atlantis-html' },
          },
          {
            urlPattern: ({ request }) =>
              ['style', 'script', 'worker', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: { cacheName: 'atlantis-assets' },
          },
        ],
      },
      manifest: {
        name: 'ATLANTIS',
        short_name: 'ATLANTIS',
        description: 'Offline analytics platform',
        theme_color: '#0A0E14',
        background_color: '#0A0E14',
        display: 'standalone',
        icons: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});

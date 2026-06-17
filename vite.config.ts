/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.VITE_BASE ?? '/counting-friends/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/**/*'],
      manifest: {
        name: 'Counting Friends',
        short_name: 'Counting',
        description:
          'A gentle, no-fail tap-to-count game for pre-readers. No ads, no data, works offline.',
        lang: 'en',
        dir: 'ltr',
        categories: ['education', 'kids', 'games'],
        theme_color: '#FBF3DC',
        background_color: '#FBF3DC',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        screenshots: [
          {
            src: 'assets/marketing/frame-1.png',
            sizes: '392x487',
            type: 'image/png',
            label: 'Tap your friends to count',
          },
          {
            src: 'assets/marketing/frame-2.png',
            sizes: '392x487',
            type: 'image/png',
            label: 'Every answer is a celebration',
          },
          {
            src: 'assets/marketing/frame-3.png',
            sizes: '392x487',
            type: 'image/png',
            label: 'No ads. No data. No fail.',
          },
        ],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Asset library + fonts can exceed the default 2 MiB precache ceiling.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    // Playwright e2e specs live in e2e/ and must not be collected by Vitest
    // (they use @playwright/test APIs like test.use that error under Vitest).
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});

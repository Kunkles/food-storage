import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Set base to your repo name when deploying to GitHub Pages, e.g. '/FoodStorage/'
export default defineConfig({
  plugins: [
    react(),
    // Installable, works offline, and picks up new versions when online.
    // 'prompt' waits for the person to press Reload rather than swapping the
    // app out from under them mid-edit.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Food Storage',
        short_name: 'Food Storage',
        description: 'Plan and track emergency food, water and fuel for your household.',
        theme_color: '#2f6f4f',
        background_color: '#faf8f3',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // The policy pages are their own documents, not routes in the app.
        navigateFallbackDenylist: [/privacy\.html$/, /terms\.html$/],
        cleanupOutdatedCaches: true,
        // Photos of recipes saved from TheMealDB, so they still show offline.
        runtimeCaching: [{
          urlPattern: /^https:\/\/www\.themealdb\.com\/images\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'recipe-photos',
            expiration: { maxEntries: 200 },
            cacheableResponse: { statuses: [0, 200] },
          },
        }],
      },
    }),
  ],
  base: process.env.VITE_BASE || '/',
})

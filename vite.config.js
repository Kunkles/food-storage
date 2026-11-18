import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Which build this is, shown in the app and written to version.json so a
// running copy can tell when a newer one has been deployed.
function gitId() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}
const BUILD = { id: gitId(), date: new Date().toISOString() }

const versionFile = {
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(BUILD) })
  },
}

// Set base to your repo name when deploying to GitHub Pages, e.g. '/FoodStorage/'
export default defineConfig({
  define: { __APP_BUILD__: JSON.stringify(BUILD) },
  plugins: [
    react(),
    versionFile,
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
        // The policy pages and reference copies are their own documents, not routes in the app.
        navigateFallbackDenylist: [/privacy\.html$/, /terms\.html$/, /\/reference\//],
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
        }, {
          // The barcode reader's engine, kept after the first scan so it works offline.
          urlPattern: /\.wasm$/,
          handler: 'CacheFirst',
          options: { cacheName: 'barcode-reader', expiration: { maxEntries: 4 } },
        }, {
          // The label reader (text recognition), downloaded the first time it's used.
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/(tesseract\.js|tesseract\.js-core|@tesseract\.js-data)/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'label-reader',
            expiration: { maxEntries: 20 },
            cacheableResponse: { statuses: [0, 200] },
          },
        }],
      },
    }),
  ],
  base: process.env.VITE_BASE || '/',
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// When VITE_STANDALONE=1, produce a single-file build with no PWA and no
// code-splitting — suitable for inlining into a self-contained HTML artifact.
const isStandalone = process.env.VITE_STANDALONE === '1';

export default defineConfig({
  plugins: [
    react(),
    ...(!isStandalone
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
            manifest: {
              name: 'ForensicSaathi — Evidence Integrity Engine',
              short_name: 'ForensicSaathi',
              description: 'Digital Companion for Field Drug Testing (SIH 2026 — PS 26231)',
              theme_color: '#0a0d12',
              background_color: '#0a0d12',
              display: 'standalone',
              orientation: 'portrait',
              scope: '/',
              start_url: '/',
              icons: [
                { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
              runtimeCaching: [
                {
                  urlPattern: /^\/api\//,
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'forensicsaathi-api-cache',
                    expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
                    networkTimeoutSeconds: 4,
                  },
                },
              ],
            },
            devOptions: { enabled: false },
          }),
        ]
      : []),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    ...(isStandalone
      ? {
          rollupOptions: {
            output: {
              // Merge ALL dynamic imports into the single entry chunk so the
              // standalone HTML needs only one <script> tag with no external deps.
              inlineDynamicImports: true,
            },
          },
        }
      : {}),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

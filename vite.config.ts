import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'CineVault By Sasuu',
          short_name: 'CineVault',
          description: 'Explore, search, and download high-quality curated films with rich metadata, trailers, IMDb ratings, torrents, and magnet links.',
          theme_color: '#050505',
          background_color: '#050505',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globIgnores: ['**/assets/aistudio/**'],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/(.*yts\.(mx|gg|am|lt|bz|ag)|.*img\.yts\.gg|.*cloudfront\.net|.*images\.unsplash\.com)\/.*\.(jpg|jpeg|png|webp|svg)/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'movie-posters-cache',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Movie details cached for offline resilience (1 day max, 5s network timeout)
              urlPattern: /\/api\/(movies\/details|movie_details).*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'movie-details-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24, // 1 Day
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Movie catalog list: NetworkOnly so visitors ALWAYS receive the live, newest movie releases
              urlPattern: /\/api\/(movies(\/list)?|v2\/list_movies).*/i,
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true' && !process.env.CONTROL_PLANE_PORT,
      // Disable file watching when HMR is disabled to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' || Boolean(process.env.CONTROL_PLANE_PORT) ? null : {},
    },
  };
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'icons8-crab-16.png',
        'logo-180.jpg',
        'logo-512.jpg',
        'sea_15651557.ico'
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,json,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html'
      },
      manifest: {
        name: 'Scofield Offline',
        short_name: 'Scofield',
        description: 'Ứng dụng học từ vựng & luyện thi Offline 100%',
        theme_color: '#863bff',
        background_color: '#f6f7fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/logo-180.jpg',
            sizes: '180x180',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: '/logo-512.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['assets/img/*.png'],
            manifest: {
                name: 'MyPortfolio',
                short_name: 'MyPortfolio',
                description: '投資ポートフォリオ管理アプリ',
                theme_color: '#1e3a5f',
                background_color: '#f5f7fa',
                display: 'standalone',
                scope: '/myportfolio.github.io/',
                start_url: '/myportfolio.github.io/',
                icons: [
                    {
                        src: '/myportfolio.github.io/assets/img/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/myportfolio.github.io/assets/img/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/api\./i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24
                            }
                        }
                    }
                ]
            }
        })
    ],
    base: '/myportfolio.github.io/',
    build: {
        outDir: 'dist'
    }
})

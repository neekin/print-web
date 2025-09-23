import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      strategies: 'injectManifest',
      manifest: {
        name: 'Print Web',
        short_name: 'PrintWeb',
        description: 'Print Web App',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'zh-CN',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
            {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      // 使用自定义 sw (injectManifest 模式)，runtime 缓存逻辑在 sw.js 内实现
      srcDir: 'src',
      filename: 'sw.js'
    })
  ],
  define: { __APP_VERSION__: JSON.stringify(Date.now()) } // 或用 package.json 版本
})

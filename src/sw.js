/*
 * 自定义 Service Worker (injectManifest 模式)
 * 1. __WB_MANIFEST 由 vite-plugin-pwa 注入构建产物列表
 * 2. 处理 skipWaiting 消息
 * 3. 提供基础 runtime 缓存策略（图片 CacheFirst / 接口 NetworkFirst）
 */

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// 让新的 SW 立即控制页面（配合前端 controllerchange 刷新）
clientsClaim()

// 预缓存由构建注入的清单
precacheAndRoute(self.__WB_MANIFEST || [])

// 图片缓存：CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 7 * 24 * 3600 })
    ]
  })
)

// API 缓存：NetworkFirst (匹配 /api/ 可根据实际修改)
registerRoute(
  ({ url }) => /\/api\//.test(url.pathname),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 })
    ]
  })
)

self.addEventListener('message', (event) => {
  if (!event.data) return
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

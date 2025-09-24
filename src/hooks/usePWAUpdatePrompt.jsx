import { useEffect, useState, useRef } from 'react'
import { Modal, Button, Spin } from 'antd'

/**
 * Hook: 监听 PWA 更新并弹出友好对话框
 * 流程：
 * 1. vite-plugin-pwa 注册的 Service Worker 有新版本时，会触发 `waiting` 状态
 * 2. 我们通过 `navigator.serviceWorker` 监听 `controllerchange` 与自定义消息
 * 3. 收到更新消息 -> 展示 Modal -> 用户点“立即更新” -> 调用 skipWaiting + reload
 */
export default function usePWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState(null)
  const [updating, setUpdating] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // 主动轮询检查更新，每1分30秒（90秒）
    const checkForUpdates = () => {
      navigator.serviceWorker.ready.then(reg => {
        console.log('[PWA] checking for updates...')
        reg.update()
      })
    }
    const intervalId = setInterval(checkForUpdates, 90000) // 1分30秒 = 90000ms

    // 监听 sw 的更新流程（来自 vite-plugin-pwa 推荐写法的变种）
    const onRegistration = (reg) => {
      if (!reg) return
      if (reg.waiting) {
        console.log('[PWA] found waiting worker')
        setWaitingWorker(reg.waiting)
        setNeedRefresh(true)
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] new worker installed & waiting')
              setWaitingWorker(newWorker)
              setNeedRefresh(true)
            }
          })
        }
      })
    }

    navigator.serviceWorker.ready.then(onRegistration)

    // 有新的 worker 激活后，页面自动 reload 一次
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] controller changed -> reload')
      window.location.reload()
    })

    // 处理通过 postMessage 发送的通知 (可选增强)
    const onMessage = (e) => {
      if (!e.data) return
      if (e.data.type === 'NEW_VERSION_AVAILABLE') {
        console.log('[PWA] message: NEW_VERSION_AVAILABLE')
        setNeedRefresh(true)
      }
      if (e.data.type === 'READY_TO_RELOAD') {
        console.log('[PWA] message: READY_TO_RELOAD')
        window.location.reload()
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    return () => {
      clearInterval(intervalId)
      navigator.serviceWorker.removeEventListener('message', onMessage)
    }
  }, [])

  const confirmRefresh = () => {
    if (updating) return
    setUpdating(true)
    if (waitingWorker) {
      console.log('[PWA] send SKIP_WAITING to waiting worker')
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      // 兜底：若 5 秒内没有 controllerchange，强制刷新
      timeoutRef.current = setTimeout(() => {
        console.warn('[PWA] timeout waiting for controllerchange, force reload')
        window.location.reload()
      }, 5000)
    } else if (navigator.serviceWorker?.controller) {
      console.log('[PWA] no waiting worker, force reload')
      window.location.reload()
    } else {
      console.log('[PWA] no controller, normal reload')
      window.location.reload()
    }
  }

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const UpdateModal = () => (
    <Modal
      open={needRefresh}
      closable={!updating}
      maskClosable={false}
      footer={[
        !updating && <Button key="later" onClick={() => setNeedRefresh(false)}>稍后</Button>,
        <Button key="refresh" type="primary" disabled={updating} onClick={confirmRefresh}>
          {updating ? <><Spin size="small" style={{ marginRight: 6 }} /> 更新中...</> : '立即更新'}
        </Button>
      ].filter(Boolean)}
    >
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>发现新版本</div>
      <div style={{ color: '#555', marginBottom: 12 }}>新功能或修复已经准备好，点击“立即更新”加载最新版本。</div>
      {updating && <div style={{ fontSize: 12, color: '#888' }}>正在应用更新，如长时间无响应将自动刷新...</div>}
    </Modal>
  )

  return { needRefresh, UpdateModal }
}

import React, { useEffect, useState } from 'react'
import PrintMain from './pages/printMain'
import { healthCheck, /* createAndVerify */ } from './utils/licenceService'

// 免重复校验缓存时长（毫秒），例如 10 分钟；不需要可设为 0
const LICENSE_CACHE_TTL = 10 * 60 * 1000
const LICENSE_CACHE_KEY = 'license_check_ok_at'

function App() {
  const [allow, setAllow] = useState(null)

  useEffect(() => {
    const isDev = import.meta.env.DEV
    alert(isDev)
    if (isDev) {
      setAllow(true)
      return
    }
    // 缓存命中：最近一次成功校验在 TTL 内
    if (LICENSE_CACHE_TTL > 0) {
      const last = parseInt(localStorage.getItem(LICENSE_CACHE_KEY) || '0', 10)
      if (last && Date.now() - last < LICENSE_CACHE_TTL) {
        setAllow(true)
        return
      }
    }

    const machineCode = window.__machineCode
    if (!machineCode) {
      setAllow(false)
      return
    }

    let canceled = false
      ; (async () => {
        try {
          const result = await healthCheck(machineCode, 1)
          if (canceled) return
          if (result.ok) {
            localStorage.setItem(LICENSE_CACHE_KEY, Date.now().toString())
            setAllow(true)
          } else {
            // 如需失败时自动创建再校验，取消下面注释
            /*
            const created = await createAndVerify(machineCode, 1)
            if (canceled) return
            if (created.ok) {
              localStorage.setItem(LICENSE_CACHE_KEY, Date.now().toString())
              setAllow(true)
            } else {
              setAllow(false)
            }
            */
            setAllow(false)
          }
        } catch {
          if (!canceled) setAllow(false)
        }
      })()

    return () => { canceled = true }
  }, [])

  if (allow === null) {
    return <div style={{ padding: 40 }}>正在校验客户端...</div>
  }
  if (!allow) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>客户端校验失败，禁止访问！</div>
  }
  return <PrintMain />
}

export default App
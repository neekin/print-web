import React, { useEffect, useState } from 'react'
import PrintMain from './pages/PrintMain'

function App() {
  const [allow, setAllow] = useState(null)

  useEffect(() => {
    // 检查是否为开发模式
    if (process.env.NODE_ENV === 'development') {
      setAllow(true)
      return
    }

    // 假设 C# 注入 window.__clientKey 和 window.__machineCode
    const clientKey = window.__clientKey
    const machineCode = window.__machineCode

    // 向服务端校验
    fetch('https://your-server.com/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientKey, machineCode })
    })
      .then(res => res.json())
      .then(data => setAllow(data.allow === true))
      .catch(() => setAllow(false))
  }, [])

  if (allow === null) {
    return <div>正在校验客户端...</div>
  }
  if (!allow) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>客户端校验失败，禁止访问！</div>
  }

  return <PrintMain />
}

export default App
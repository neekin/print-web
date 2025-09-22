import { buildPreviewHtml, pixelsToMM } from './receiptTemplate'

/**
 * 发送打印请求并等待 C# 返回结果
 * @param {object} data 小票数据（已由业务层组装完成）
 * @param {number} offsetXPx 右偏移(像素)
 * @param {number} printerDpi 打印机 DPI（可选，默认 203）
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export function printHtmlTicket(data, offsetXPx = 0, printerDpi = 203) {
  return new Promise((resolve, reject) => {
    if (!window.chrome || !window.chrome.webview) {
      reject(new Error('不在 WebView2 环境中'))
      return
    }

    const requestId = 'pr_' + Date.now() + '_' + Math.random().toString(16).slice(2)

    // 像素转毫米（receiptTemplate 里 buildReceiptHtml 期望 mm）
    const offsetXmm = pixelsToMM(offsetXPx, printerDpi)

    const html = buildPreviewHtml(data, offsetXmm)

    const handler = (e) => {
      const msg = e.data
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'printResult' && msg.requestId === requestId) {
        window.chrome.webview.removeEventListener('message', handler)
        if (msg.ok) {
          resolve({ ok: true })
        } else {
          const err = msg.error || '未知错误'
            ; (console && console.error) && console.error('打印失败', err)
          reject(new Error(err))
        }
      }
    }

    window.chrome.webview.addEventListener('message', handler)

    // 发送消息（依旧用字符串，让 C# 端原逻辑兼容）
    window.chrome.webview.postMessage(JSON.stringify({
      type: 'printHtml',
      requestId,
      html
    }))

    // 超时保护（可选）
    setTimeout(() => {
      window.chrome.webview.removeEventListener('message', handler)
      reject(new Error('打印超时'))
    }, 30000)
  })
}
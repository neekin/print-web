import bwipjs from 'bwip-js' // 保留条码库

// 生成指定字节数的随机十六进制（大写）
function randomHex(bytes) {
  const buf = new Uint8Array(bytes)
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(buf)
  } else {
    // 极少数不支持时的降级（不安全，但避免崩溃）
    for (let i = 0; i < bytes; i++) {
      buf[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(buf)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

// 生成 PDF417 条码并返回 base64
export const generateBarcode = async (text, canvasId = 'barcode-canvas') => {
  try {
    let canvas = document.getElementById(canvasId)
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.id = canvasId
      canvas.style.display = 'none'
      document.body.appendChild(canvas)
    }
    bwipjs.toCanvas(canvas, {
      bcid: 'pdf417',
      text,
      scale: 1,
      columns: 4,
      width: 200,
      height: 40
    })
    return canvas.toDataURL('image/png')
  } catch (error) {
    throw new Error('条码生成失败: ' + error.message)
  }
}

// 7 段，每段 4 位（2 字节）
export const getStrCode = () => {
  try {
    const segments = []
    for (let i = 0; i < 7; i++) {
      segments.push(randomHex(2))
    }
    return segments.join('-')
  } catch (e) {
    throw new Error('获取编码失败: ' + e.message)
  }
}

// 4 段，每段 8 位（4 字节）
export const getVerTicketCode = () => {
  try {
    const segments = []
    for (let i = 0; i < 4; i++) {
      segments.push(randomHex(4))
    }
    return segments.join('-')
  } catch (e) {
    throw new Error('获取编码失败: ' + e.message)
  }
}
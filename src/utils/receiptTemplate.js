// 要点调整：
// 1. 统一票纸：物理 76mm，内容 76mm（左右各 2mm 余量，避免热敏有效宽度不足裁切）
// 2. 使用 flex+gap-spacer = flex:1 实现每行左右两端对齐（左侧内容 / 右侧倍数）
// 3. 数字字体等宽特性（font-feature-settings: 'tnum'）保证列对齐更稳定
// 4. html2canvas 截图时请确保挂载容器设置 root.style.width='76mm'
// 5. 若仍有裁切，把 body width 改 75mm 或将打印 C# 中 paperWidthMm 调成 79f

import dayjs from 'dayjs'

// 关键：宽度与 C# 端 (576px) 严格对齐，这是 1:1 点阵打印的基础
const EFFECTIVE_DOTS = 576

export const padZero = (n) => String(n).padStart(2, '0')

// =============== HTML 生成逻辑：【修正】彻底移除 gap-spacer ===============
function generateOrderRows(data) {
  console.log(data)
  
  const orders = data.orders || []
  if (!orders.length) return ''
  const playMethodVal = orders[0]?.[0]
  const Index = ['①', '②', '③', '④', '⑤']
  if (data.playClass == '3D' && playMethodVal === '定位') {
    const pos = orders[0].slice(1, 4)
    const multiple = orders[0][4]
    const FLAGS = ['[百]', '[十]', '[个]']
    const fmt = (arr) => {
      const sorted = Array.isArray(arr) ? [...arr].sort() : []
      const display = Array(10).fill('-')
      sorted.forEach((d, i) => {
        if (i < 10) display[i] = d
      })
      return display.join('')
    }
    return pos.map((p, i) => `
      <div class="order-line">
    
      <span class="pos-index">${FLAGS[i]}</span>
      <span class="pos-numbers mono">${fmt(p)}</span>
        <div class="gap-spacer"></div>
        ${i === pos.length - 1 ? `<span class="multiple">[${multiple}倍]</span>` : ''}
      </div>`).join('')
  }

  if (data.playClass == '3D' &&playMethodVal?.includes('复式')) {
    const nums = orders[0][1]
    const multiple = orders[0][2]
    return `<div class="order-line">
      <span class="dantuo">${Array.isArray(nums) ? nums.join('+') : ''}</span>
      <span class="multiple">[${multiple}倍]</span>
    </div>`
  }

  if (data.playClass == '3D' && playMethodVal === '2D') {
    return orders.map((o, i) => `
      <div class="order-line">
        
          <span class="index">${Index[i]}</span>
          <span class="numbers mono">${o.slice(1, 3).join(' ')}</span>
        <div class="gap-spacer"></div>
        <span class="multiple">[${o[3]}倍]</span>
      </div>`).join('')
  }

  if (data.playClass == '3D' && playMethodVal?.includes('胆拖')) {
    const danma = orders[0][1] || []
    const tuoma = orders[0][2] || []
    const multiple = orders[0][3]
    const isSingleGroup = playMethodVal === '组三单选胆拖' || playMethodVal === '组六单选胆拖'
    if (isSingleGroup && danma.length === 2 && danma[0] !== danma[1]) {
      return danma.map((d, i) => `
        <div class="order-line">
    
            <span class="index">${Index[i]}</span>
            <span class="dantuo">${d}<span class="sanjiao"></span>${tuoma.join('+')}</span>
       <div class="gap-spacer"></div>
          <span class="multiple">[${multiple}倍]</span>
        </div>`).join('')
    }
    return `
      <div class="order-line">
        
          <span class="index">${Index[0]}</span>
          <span class="dantuo">${danma.join('+')}<span class="sanjiao"></span>${tuoma.join('+')}</span>
  <div class="gap-spacer"></div>
        <span class="multiple">[${multiple}倍]</span>
      </div>`
  }

  if (/^选(?:[一二三四五六七八九]|十)单式$/.test(playMethodVal)) {
    const rawLines = Array.isArray(orders[0]?.[1]) ? orders[0][1] : []
    const lines = rawLines.map(e => {
      const nums = Array.isArray(e?.[0]) ? [...e[0]].sort((a, b) => a - b) : []
      const mult = e?.[1] == null ? 1 : e[1]
      return [nums, mult]
    }).filter(l => l[0].length)
    if (!lines.length) return ''
    const colCount = Math.min(lines[0][0].length, 10)
    const gridClass = colCount >= 10 ? 'happy-eight-grid is-full' : 'happy-eight-grid';
    return lines.map((o, i) => `
      <div class="happy happy-signle order-line">
          <span class="index" style="margin-top:-2px;">${Index[i] || ''}</span>
          <div class="${gridClass}" style="--cols:${colCount}">
            ${o[0].map(n => `<span class="num mono">${padZero(n)}</span>`).join('')}
          </div>
        
        <span class="multiple">[${o[1]}倍]</span>
      </div>`).join('')
  }

  if(/^选(?:[一二三四五六七八九]|十)复式$/.test(playMethodVal)){
    const rawLines = Array.isArray(orders[0]?.[1]) ? orders[0][1] : []
    const nums = rawLines[0]?.[0] || []
    const multiple = rawLines[0]?.[1] || 1

    // 分组：每 8 个一行
    const rows = []
    for (let i = 0; i < nums.length; i += 8) {
      rows.push(nums.slice(i, i + 8))
    }

    const rowsHtml = rows.map((row, idx) => {
      const isLast = idx === rows.length - 1
      // 加号放在 join 内，天然无尾部加号
      const numbersHtml = row
        .map(n => `<span class="num mono">${padZero(n)}</span>`)
        .join('<span class="plus">+</span>')
      return `
        <div class="he-row">
          ${numbersHtml}
          ${isLast ? `<span class="multiple-inline">[${multiple}倍]</span>` : ''}
        </div>`
    }).join('')

    return `
      <div class="happy order-line">
        <div class="happy-eight-lines">
          ${rowsHtml}
        </div>
      </div>`
  }
if(/^选(?:[一二三四五六七八九]|十)胆拖$/.test(playMethodVal)){
  const dm = Array.isArray(orders[0]?.[1]) ? orders[0][1] : []
  const tm = Array.isArray(orders[0]?.[2]) ? orders[0][2] : []
  const multiple = orders[0]?.[3] || 1
  const dmStr = dm.map(n=>padZero(n))
  console.log(dmStr)
  return `
    <div class="order-line">
      <div class="happy-eight-lines grid">
        ${dmStr.map(n=>`<span class="num">${n}</span>`).join('+')}<span class="sanjiao"></span>${dm.length+tm.length==80?"全拖": tm.map(n=>`<span class="num">${padZero(n)}</span>`).join('+')}
          <span class="multiple">[${multiple}倍]</span>
      </div>
    
    </div>`
}

  const isSingle = data.playMethod === '3D单选'
  const sep = isSingle ? ' ' : '+'
  return orders.map((o, i) => `
    <div class="order-line">

        <span class="index">${Index[i]}</span>
        <span class="numbers mono">${o.slice(1, 4).join(sep)}</span>
<div class="gap-spacer"></div>
      <span class="multiple">[${o[4]}倍]</span>
    </div>`).join('')
}

export function buildReceiptHtml(data, offsetX_px = 0) {
  const isHappyEight = data.playClass === '快乐8'
  const getTitle = () => isHappyEight ? '快 乐 8' : '3D'
  const barcodeImg = data.barcodeData
    ? `<div class="barcode-container"><img src="${data.barcodeData.startsWith('data:') ? data.barcodeData : 'data:image/png;base64,' + data.barcodeData}" /></div>`
    : ''
//   return `<!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Document</title>
//     <style>*{padding:0;margin:0}</style>
// </head>
// <body>
//     1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
// </body>
// </html>` // 占位，避免 prettier 自动删除下面的模板字符串
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>打印小票</title>
<style>
*{padding:0;margin:0}
/* 屏幕预览固定 640px，不再使用 mm，避免浏览器缩放造成偏差 */
html,body{
  margin:0;
  padding:0;
  width:80mm;
  font:10px/1.25 "Microsoft YaHei","Arial",sans-serif;
  
   position:relative;
   overflow:hidden;
        -webkit-print-color-adjust: exact; /* Chrome/Safari 强制打印背景和颜色 */
        print-color-adjust: exact; /* 标准 */
}
.receipt-container{
  box-sizing:border-box;
  width:74mm;
  padding:0;
  margin:0 auto;
  margin-left: ${offsetX_px}px;
  
}
  .grid-row {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 2px;
  font-size: 15px;
  align-items: center;
}
.happy-eight-lines.grid .num {
  text-align: center;
  font-size: 14px;
}
.grid-row .plus {
  text-align: center;
  font-size: 16px;
}

.grid-row .text {
  text-align: center;
  font-size: 14px;
}

/* 打印：统一只声明一次宽度，纸宽 74mm，内容 74mm（左右 2mm） */
 @media print {
   * {
    -webkit-font-smoothing: none;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeSpeed;
  }
    @page {
        size: 80mm auto; /* 纸张尺寸 */
        margin: 0; /* 打印边距 */
        padding:0;
       
       
    }
    body {
        width: 80mm; /* 实际可打印宽度 */
        margin: 0;
        padding: 0;
        background:#fff;
      
         
    }
    .receipt-container {
        width:74mm;
        padding:0;
        margin:0 auto;
        margin-left: ${offsetX_px}px;
    }
  }

/* 以下保持原有结构样式（仅影响排版，不改内容生成） */
.center{text-align:center;}
.bold{font-weight:600;}
.header{font-size:12px;margin-bottom:4px;}
.game-name{font-size:16px;margin-bottom:4px;}
.info-line{
  display:grid;
  grid-template-columns: calc(1fr - 2px) 1fr 1fr;
  font-size:12px;
  grid-template-columns: calc(33.33% - 3px) calc(33.33% - 5px) 35.33%;
}
.order-section{margin-top:4px;overflow:hidden;}
.order-line{
  display:flex;
  align-items:center;
  font-size:12px;
  line-height:13px;
  margin-bottom:3px;
  overflow:hidden;
  font-family:"Microsoft YaHei","微软雅黑",Arial;
  font-width:600;
}
.order-line:last-child{margin-bottom:0;}
.index,.pos-index{padding-right:5px;flex-shrink:0;}
.numbers,.pos-numbers{font-size:16px;letter-spacing:4px;}
.dantuo{font-size:14px;letter-spacing:1px;white-space:nowrap;}
.multiple,.multiple-inline{font-size:14px;margin-left:10px;flex-shrink:0;}

.happy{display:flex;align-items:center;flex-wrap:wrap;}
.happy .multiple{margin-left:10px;}
.happy-signle .num{margin-left:3px; font-size:16px;}
.happy-signle .num:first-child{margin-left:0;}
.happy-eight-lines.grid{
    display: grid;
    grid-template-columns: repeat(16, 16px);
    gap: 1px;
    flex-grow: 1;
    justify-items: center;
    font-size: 16px;
    align-items: center;
}
.happy-eight-lines.grid .multiple{
grid-column: span 3; 
}
.happy-eight-lines{display:inline-block;font-size:0;vertical-align:top;}
.happy-eight-lines .he-row{display:flex;align-items:center;margin-bottom:2px;font-size:15px;}
.happy-eight-lines .he-row:last-child{margin-bottom:0;}
.happy-eight-lines .num{display:inline-block;width:20px;text-align:center;font-size:18px;}
.happy-eight-lines .plus{display:inline-block;width:14px;text-align:center;font-size:18px;}
.happy-eight-lines .multiple-inline{display:inline-block;margin-left:6px;font-size:14px;line-height:16px;}

.order-happy-eight-container{
  display:grid;
  grid-template-columns:repeat(10,22px);
  align-items:center;
  justify-content:start;
}
.order-happy-eight-container > .num{
  font-size:16px;
  text-align:center;
}
.happy-eight-lines .he-row .num{font-size:16px;}

.sanjiao{
  position:relative;
  display:inline-block;
  overflow:hidden;
  height:16px;
  width:19px;
  line-height:16px;
  font-size:30px;
}
.sanjiao::after{
  content:"◇";
  position:absolute;
  top:0;
  left:0;
}
.sanjiao::before{
  content:"";
  position:absolute;
  bottom:0;
  left:0;
  height:8px;
  width:100%;
  background:#fff;
  z-index:1;
}

.totals-line{font-size:12px;text-align:center;padding-bottom:4px;}
.footer-line{font-size:12px;line-height:12px;}
.footer-line span{font-size:10px;}
.barcode-container,.qrcode-container{margin:2px 0;}
.barcode-container img,.qrcode-container img{max-width:96%;height:auto;display:inline-block;}
.mono{font-feature-settings:"tnum";font-variant-numeric:tabular-nums;}
                .gap-spacer {
                  width: 20px;       /* 理想的间距大小 */
                  min-width: 0;        /* 允许收缩到 0 */
                  flex-shrink: 1000;   /* 一个非常高的收缩因子，确保它比 element-b 更优先收缩 */
                                        /* (假设 element-b 的 flex-shrink 是默认的 1 或更小的值) */
                  /* background-color: rgba(0,0,0,0.1); /* 可选：用于调试时可视化垫片 */
                }
</style>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
  <div class="receipt-container">
    <div class="center bold header">${data.strCode}</div>
    <div class="center game-name ${isHappyEight ? 'bold':''}">${getTitle()}</div>
    <div class="info-line">
      <span>期号:${data.salePeriod}</span>
      <span>流水号:${data.serialNumber}</span>
      <span>多期:1</span>
    </div>
    <div class="info-line">
      <span>金额:${data.price}元</span>
      <span style="grid-column:span 2;">玩　法:${isHappyEight ? data.orders[0]?.[0] : data.playMethod}</span>
    </div>
    <div class="info-line">
      <span style="grid-column:span 2;">销售时间:${data.saleTime || data.ticketSaleTime}</span>
      <span>开奖:${data.drawTime}</span>
    </div>
    <div class="order-section">
      ${generateOrderRows(data)}
    </div>
    <div class="totals-line" ${isHappyEight ? 'style="text-align:left;"':''}>
      <span>感谢您为公益事业贡献 ${data.contribute} 元</span>
    </div>
    <div class="footer-line">${data.machineCode}:${data.storeAddress}</div>
    <div class="footer-line">验票码:<span>${isHappyEight ? (data.verTicketCode || '').slice(0,17) : (data.verTicketCode || '')}</span></div>
    ${!isHappyEight && data.lastPeriodText ? `<div class="footer-line">${data.lastPeriodText}</div>` : ''}
    ${barcodeImg}
    ${data.qrCodeData ? `<div class="qrcode-container"><img id="qrCodeImg" src="data:image/png;base64,${data.qrCodeData}" alt="QR Code"></div>` : ''}
    <div class="footer-line center">${data.copywriting}</div>
  </div>
  <div class='point'></div>
</body>
</html>`
}

export function buildPreviewHtml(data, offsetX_px = 0) {
  return buildReceiptHtml(data, offsetX_px)
}

export function pixelsToMM(pixels, dpi = 203) {
  if (typeof pixels !== 'number' || typeof dpi !== 'number' || dpi <= 0) {
    console.error('无效的输入值 for pixelsToMM')
    return 0 // 或者抛出错误
  }
  const inches = pixels / dpi
  const mm = inches * 25.4
  return mm
}
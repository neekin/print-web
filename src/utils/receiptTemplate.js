// 要点调整：
// 1. 统一票纸：物理 80mm，内容 76mm（左右各 2mm 余量，避免热敏有效宽度不足裁切）
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
      <div class="happy order-line">
          <span class="index">${Index[i] || ''}</span>
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

export function buildReceiptHtml(data,offsetX_mm=20) {
  const isHappyEight = data.playClass === '快乐8'
  console.log('------------------------------------------------------------')
   const getTitle = () => {
        let title = '3D'
        if (isHappyEight) {
          title = '快 乐 8'
        }
        return title
      }
  const barcodeImg = data.barcodeData
    ? `<div class="barcode-container"><img src="${data.barcodeData.startsWith('data:') ? data.barcodeData : 'data:image/png;base64,' + data.barcodeData}" /></div>`
    : ''

  // 【样式总迁移】严格按照 index.js 的样式和布局逻辑重写
  return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>打印小票</title>
          <style>
              body {
                  font-family: "Microsoft YaHei", "微软雅黑", Arial;
                  font-size: 10px; /* 根据实际效果调整基础字号 */
                  width: 76mm; /* 实际可打印宽度 */
                  margin: 0;
                  padding:0;
                  line-height: 1.1;
                  color: black;
                  background-color: white; /* 确保背景是白色 */
                  overflow: hidden;
              }
              .receipt-container {
                  padding: 0; /* 上下留一点边距 */
                  width: 100%;
                  box-sizing: border-box;
                  min-height:310px;
                  overflow: hidden;
                  position: relative;
 
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .header { font-size: 12px; margin-bottom: 4px; }
              .game-name { font-size: 16px; margin-bottom: 4px;font-family: "Microsoft YaHei", "微软雅黑", Arial;}
              .info-line { 
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  font-size: 12px;
                  
              }
              .info-line span {  }
              .info-line .label { /* 可选，如果需要标签 */ }
              .info-line .value { /* 可选 */ }
              .separator { border-top: 1px dashed black; margin: 5px 0; }
              .order-section { margin-top:4px; max-height:160px; overflow: hidden;  }
              .order-line {line-height: 13px;overflow: hidden; display: flex;margin-bottom: 3px; font-size: 12px; font-family: "Microsoft YaHei", "微软雅黑", Arial; }
              .order-line .index { padding-right: 5px; font-family: "Microsoft YaHei", "微软雅黑", Arial;flex-shrink: 0 }
              .order-line .numbers { 
                  font-size: 16px;
                  letter-spacing: 4px; 
                  text-align: left;
                  font-family: "Microsoft YaHei", "微软雅黑", Arial;
                  min-width:60px;
        
              }
    
              .happy{
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
              }
              .happy .multiple{
                margin-left:20px;
              }
            
              .happy-eight-lines{
                display:inline-block;
                font-size:0;
                vertical-align: top;
              }
              .happy-eight-lines .he-row{
                display:flex;
                align-items:center;
                margin-bottom:2px;
                font-size:15px;
              }
              .happy-eight-lines .he-row:last-child{
                margin-bottom:0;
              }
              .happy-eight-lines .num{
                display:inline-block;
                width:20px;
                text-align:center;
                font-size:18px;
              }
              .happy-eight-lines .plus{
                display:inline-block;
                width:14px;
                text-align:center;
                font-size:18px;
              }
              .happy-eight-lines .multiple-inline{
                display:inline-block;
                margin-left:6px;
                font-size:14px;
                line-height:16px;
              }
              .happy-eight-grid{
                  display: inline-grid;
                  grid-template-columns: repeat(var(--cols, 1), 20px);
                  gap: 2px 4px;
                  margin-left: 4px;
                  font-size: 16px;
              }
              .happy-eight-grid.is-full{
                  font-size: 14px; /* 缩小1号字体 (从16px到14px) */
                  grid-template-columns: repeat(var(--cols, 1), 18px); /* 同时减小每列的宽度 */
                  gap: 2px 3px; /* 也可以适当减小间距 */
              }
              .happy  >.num{
                  font-family: "Microsoft YaHei", "微软雅黑", Arial;
                  font-size: 16px;
                  letter-spacing: 0px;
                  box-sizing: border-box;
                  text-align: center;
                  min-width: 0; /* 防止内容溢出 */
              }  
              .happy  .multiple{
                 font-size: 14px;
                 margin-left:10px;
                  }
              .order-happy-eight-container{
                  display: grid;
                  grid-template-columns: repeat(10, 22px);
                  align-items: center;
                  justify-content: start; /* 左对齐 */
              }
               .order-happy-eight-container >.num{
                  font-family: "Microsoft YaHei", "微软雅黑", Arial;
                  font-size: 16px;
                  letter-spacing: 0px;
                  box-sizing: border-box;
                  text-align: center;
                  min-width: 0; /* 防止内容溢出 */
              }  
              .spc{width:4px;}
              .order-happy-eight-container .multiple{
                 font-size: 14px;
                 margin-left:10px;
                  }
              .order-line .dantuo { 
                  font-size: 16px;
        
                  letter-spacing: 1px; 
                  text-align: left;
                 font-family: "Microsoft YaHei", "微软雅黑", Arial;
                  white-space: nowrap; 
              }
              .order-line .pos-index {font-size: 14px; padding-right: 8px; font-family: "Microsoft YaHei", "微软雅黑", Arial; }
             
              .order-line .pos-numbers { 
                  font-size: 16px;
                  letter-spacing: 4px; 
                  text-align: left;
                 font-family: "Microsoft YaHei", "微软雅黑", Arial;
              }
            .sanjiao{
              position: relative;
              display: inline-block;
              overflow: hidden;
              height: 16px;
              width: 19px;
              line-height: 16px;
              font-size: 30px;
          }

          .sanjiao::after{
            content: "◇";
            position: absolute;
            top:0;
          }
          .sanjiao::before{
            content: "";
            height: 8px;
            width: 100%;
            background-color: #fff;
            position: absolute;
            bottom: 0;
            z-index: 1;
          }
  
  
              .order-line .multiple { flex-shrink: 0; text-align: left; font-family: "Microsoft YaHei", "微软雅黑", Arial; }
              .order-line .posmultiple{ padding-left: 5px; text-align: left; font-family: "Microsoft YaHei", "微软雅黑", Arial; }
              .totals-line { font-size: 12px;font-family: "Microsoft YaHei", "微软雅黑", Arial;text-align: center; padding-bottom: 4px;}
              .footer-line { font-size: 12px;  line-height: 12px; }
              .footer-line span{ font-size: 10px; }
              .barcode-container, .qrcode-container {  margin-top:2px; margin-bottom: 2px; }
              .barcode-container img, .qrcode-container img { max-width: 90%; height: auto; display: inline-block; }
              .point{
               font-size: 10px;
                transform: scale(0.1);
                position: absolute;
                bottom: 0;
                 
              }
                .gap-spacer {
                  width: 20px;       /* 理想的间距大小 */
                  min-width: 0;        /* 允许收缩到 0 */
                  flex-shrink: 1000;   /* 一个非常高的收缩因子，确保它比 element-b 更优先收缩 */
                                        /* (假设 element-b 的 flex-shrink 是默认的 1 或更小的值) */
                  /* background-color: rgba(0,0,0,0.1); /* 可选：用于调试时可视化垫片 */
                }
              /* 打印特定样式 */
              @media print {
                  @page {
                      size: 80mm auto; /* 纸张尺寸 */
                      margin: 0; /* 打印边距 */
                      min-height:310px;
                     overflow: hidden;
                  }
                  body {
                      width: 76mm; /* 实际可打印宽度 */
                      margin: 0;
                      padding: 0;
                      background:#fff;
                      -webkit-print-color-adjust: exact; /* Chrome/Safari 强制打印背景和颜色 */
                      print-color-adjust: exact; /* 标准 */
                      min-height:320px;
                       overflow: hidden;
                  }
                  .receipt-container {
                     padding: 0; /* 打印时的实际边距 */
                     overflow: hidden;
                     margin-left: ${offsetX_mm}mm;
                  }
              }
              .bold{
                  font-weight:600;
               }
          </style>
      </head>
      <body>
          <div class="receipt-container">
              <div class="center bold header">${data.strCode}</div>
              <div class="center  game-name ${isHappyEight ? 'bold' : ''}">${getTitle(data.orders)}</div>
              <div class="info-line">
                  <span>期号:${data.salePeriod}</span>
                  <span>流水号:${data.serialNumber}</span>
                  <span>多期:1</span>
              </div>
              <div class="info-line">
                  <span>金额:${data.price}元</span>
                  <span style="grid-column: span 2;">玩　法:${isHappyEight ? data.orders[0]?.[0] : data.playMethod}</span>
              </div>
              <div class="info-line">
                  <span style="grid-column: span 2;">销售时间:${data.saleTime || data.ticketSaleTime}</span>
                  <span>开奖:${data.drawTime}</span>
              </div>
              <div class="order-section">
                  ${generateOrderRows(data)}
              </div>

              <div class="totals-line" ${isHappyEight ? 'style="text-align: left;"' : ''}>
                  <span>${isHappyEight ? `感谢您为公益事业贡献 ${data.contribute} 元` : `**感谢您为公益事业贡献 ${data.contribute} 元**`}</span>
              </div>

              <div class="footer-line">${data.machineCode}:${data.storeAddress}</div>
              <div class="footer-line">验票码:<span>${isHappyEight ? (data.verTicketCode || '').slice(0,17) : (data.verTicketCode || '')}</span></div>
              ${!isHappyEight && data.lastPeriodData ? `<div class="footer-line">${data.lastPeriodData}</div>` : ''}
              ${barcodeImg}
              ${
                data.qrCodeData
                  ? `<div class="qrcode-container"><img id="qrCodeImg" src="data:image/png;base64,${data.qrCodeData}" alt="QR Code"></div>`
                  : ''
              }

              <div class="footer-line center">${data.copywriting}</div>
              <div class="point">.</div>
          </div>
      </body>
      </html>
    `
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


export function buildPreviewHtml(data,offsetX_mm=0) {
  return buildReceiptHtml(data,offsetX_mm)
}
import { app, shell, BrowserWindow, ipcMain, net } from 'electron'
import { join } from 'path'
// import { autoUpdater } from 'electron-updater'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { machineIdSync } = require('node-machine-id')

/**
 * 数字补零函数：如果是个位数，前面补0
 * @param {number|string} num - 要处理的数字
 * @returns {string} 补零后的字符串（如 01, 02, 03...）
 */
function padZero(num) {
  const numStr = String(num)
  return numStr.length === 1 ? `0${numStr}` : numStr
}

// import { initAutoUpdater } from './auto-updater'
// import { initSmallestUpdater } from './smallest-updater'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 1000,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // // 初始化全量更新
    // initAutoUpdater(mainWindow)

    // // 初始化增量更新
    // autoUpdater.on('update-not-available', () => {
    //   initSmallestUpdater(mainWindow)
    // })
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 获取打印机
  ipcMain.on('getPrinterList', async (event) => {
    const list = await mainWindow.webContents.getPrintersAsync()
    event.sender.send('printerList', list)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.on('getMachineId', (event) => {
    const machineId = machineIdSync()
    event.sender.send('machineId', machineId)
  })
  createWindow()
  // 预创建打印窗口
  getOrCreatePrintWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// 发送网络请求
ipcMain.handle('http-request', async (event, { url, method, data }) => {
  const response = await net.fetch(url, {
    method,
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  })
  return response.json()
})

// 生成条形码
import bwipjs from 'bwip-js'
ipcMain.handle('generate-barcode', async (event, text) => {
  try {
    const buffer = await bwipjs.toBuffer({
      bcid: 'pdf417',
      text: text,
      scale: 1,
      columns: 4,
      width: 200,
      height: 50
    })
    return buffer.toString('base64') // 转换为 Base64
  } catch (error) {
    throw new Error('条码生成失败: ' + error.message)
  }
})

// 生成编码
import crypto from 'crypto'
ipcMain.handle('getStrCode', () => {
  try {
    const segments = []
    // 生成 7 段 4 位十六进制字符串
    for (let i = 0; i < 7; i++) {
      const buffer = crypto.randomBytes(2) // 2 字节 = 4 位十六进制
      segments.push(buffer.toString('hex').toUpperCase())
    }
    return segments.join('-')
  } catch (error) {
    throw new Error('获取编码失败: ' + error.message)
  }
})

// 生成验票码 格式 xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
ipcMain.handle('getVerTicketCode', () => {
  try {
    const segments = []
    // 生成 4 段 8 位十六进制字符串
    for (let i = 0; i < 4; i++) {
      const buffer = crypto.randomBytes(4) // 2 字节 = 4 位十六进制
      segments.push(buffer.toString('hex').toUpperCase())
    }
    return segments.join('-')
  } catch (error) {
    throw new Error('获取编码失败: ' + error.message)
  }
})

// 获取打印机列表
ipcMain.handle('get-printers', async () => {
  try {
    const mainWindow = BrowserWindow.getFocusedWindow()
    const printers = await mainWindow.webContents.getPrintersAsync()
    return printers
  } catch (error) {
    console.error('获取打印机列表失败:', error)
    throw new Error('获取打印机列表失败: ' + error.message)
  }
})

// 设置默认打印机
ipcMain.handle('set-default-printer', async (event, printerName) => {
  try {
    const mainWindow = BrowserWindow.getFocusedWindow()
    await mainWindow.webContents.print({ silent: false, deviceName: printerName })
    return true
  } catch (error) {
    console.error('设置默认打印机失败:', error)
    throw new Error('设置默认打印机失败: ' + error.message)
  }
})

// 执行打印任务
ipcMain.handle('print-content', async (event, options) => {
  try {
    const mainWindow = BrowserWindow.getFocusedWindow()
    const result = await mainWindow.webContents.print({
      silent: options.silent || false,
      printBackground: options.printBackground || true,
      deviceName: options.printerName,
      // 其他打印选项
      copies: options.copies || 1,
      margins: options.margins || {
        marginType: 'default'
      }
    })
    return result
  } catch (error) {
    console.error('打印失败:', error)
    throw new Error('打印失败: ' + error.message)
  }
})

// 改进窗口预加载
let printWindow = null

function getOrCreatePrintWindow() {
  if (printWindow && !printWindow.isDestroyed()) {
    return printWindow
  }

  printWindow = new BrowserWindow({
    width: 640,
    height: 800,
    show: is.dev,
    // 添加透明背景以减少渲染负担
    transparent: !is.dev,
    frame: is.dev,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 添加这项可减少初始化时间
      backgroundThrottling: false
    }
  })

  // 预加载空白页面
  printWindow.loadURL('about:blank')
  return printWindow
}
/**
 * 将像素值转换为毫米值。
 * @param {number} pixels - 要转换的像素值。
 * @param {number} [dpi=96] - 用于转换的 DPI，默认为 96。
 * @returns {number} 对应的毫米值。
 */
function pixelsToMM(pixels, dpi = 203) {
  if (typeof pixels !== 'number' || typeof dpi !== 'number' || dpi <= 0) {
    console.error('无效的输入值 for pixelsToMM')
    return 0 // 或者抛出错误
  }
  const inches = pixels / dpi
  const mm = inches * 25.4
  return mm
}

// 新增：处理HTML小票打印的IPC事件
ipcMain.handle(
  'print-html-receipt',
  async (event, { receiptData, printerName, offsetX, offsetY, options }) => {
    const mainWindow = BrowserWindow.getFocusedWindow()
    if (!mainWindow) {
      return { success: false, error: '无法获取主窗口' }
    }
    const allPrinters = await mainWindow.webContents.getPrintersAsync()
    const printerExists = allPrinters.some((p) => p.name === printerName)

    if (!printerExists) {
      console.error(`打印机 "${printerName}" 不存在!`)
      return { success: false, error: `指定的打印机不存在` }
    }

    // --- 构建HTML内容 ---
    const generateHtml = (data, offsetX_mm = 0, offsetY_mm = 0) => {
      // 辅助函数，生成订单行的HTML
      // console.log(generateHtml)
      const isHappyEight = /^选(?:[一二三四五六七八九]|十)单式$/.test(data.orders[0]?.[0])
      const getTitle = () => {
        let title = '3D'
        if (isHappyEight) {
          title = '快 乐 8'
        }
        return title
      }
      const generateOrderRows = (orders) => {
        // console.log(orders, '--------------')
        const playMethodVal = orders[0]?.[0]
        const Index = ['①', '②', '③', '④', '⑤']
        console.log(orders, '--------------', playMethodVal)
        if (playMethodVal == '定位') {
          // 执行定位逻辑
          const positioningOrders = orders[0].slice(1, 4)
          const multiple = orders[0][4] // 获取倍数
          const Index = ['[百]', '[十]', '[个]']
          const formatPositionNumbers = (digits) => {
            // 确保是数组并排序
            const sortedDigits = Array.isArray(digits) ? [...digits].sort() : []
            // 创建一个长度为10，填充'-'的数组
            const displayArray = Array(10).fill('-')
            // 将已选数字填入数组前面
            sortedDigits.forEach((digit, i) => {
              if (i < 10) {
                // 防止数字过多（虽然这里最多10个）
                displayArray[i] = `${digit}`
              }
            })
            // 将数组元素连接成字符串，不加空格以保证固定宽度
            return displayArray.join('')
            // 如果希望数字和'-'之间有空格，可以使用: return displayArray.join(' ');
          }
          return positioningOrders
            .map(
              (order, index) => `
        <div class="order-line">
          <span class="pos-index">${Index[index]}</span>
          <span class="pos-numbers"> ${formatPositionNumbers(order)}</span>
          <div class="gap-spacer"></div>
          ${index === positioningOrders.length - 1 ? `<span class="multiple">[${multiple}倍]</span>` : ''}
        </div> `
            )
            .join('')
        } else if (playMethodVal?.includes('复式')) {
          // 直接访问号码数组 orders[0][1]
          const numbersArray = orders[0][1]
          const multiple = orders[0][2]

          // 确保 numbersArray 是数组，然后 join
          const numbersString = Array.isArray(numbersArray) ? numbersArray.join('+') : ''
          return `
                <div class="order-line">
                  <span class="dantuo">${numbersString}</span>
                  <div class="gap-spacer"></div>
                  <span class="multiple">[${multiple}倍]</span>
                </div>
              `
        } else if (playMethodVal == '2D') {
          return orders
            .map(
              (order, index) => `
          <div class="order-line">
            <span class="index">${Index[index]}</span>
            <span class="numbers">${order.slice(1, 3).join(' ')}</span>
            <div class="gap-spacer"></div>
            <span class="multiple">[${order[3]}倍]</span>
          </div>
        `
            )
            .join('')
        } else if (playMethodVal?.includes('胆拖')) {
          // 否则使用空格连接
          // const isSingleSelect = data.playMethod === '单选'
          // const separator = isSingleSelect ? ' ' : '+'
          const danma = orders[0][1]
          const tuoma = orders[0][2]
          const multiple = orders[0][3] // 获取倍数
          console.log(danma, tuoma, multiple, 'danma tuoma multiple', playMethodVal)
          if (playMethodVal == '组三单选胆拖' || playMethodVal == '组六单选胆拖') {
            // 判断数组里面的两个数字是否一样
            const isDanMaSame = danma[0] === danma[1]
            if (isDanMaSame) {
              return `
              <div class="order-line">
                <span class="index">${Index[0]}</span>
                <span class="dantuo">${danma.join('+')}<span class="sanjiao"></span>${tuoma.join('+')}</span>
                <div class="gap-spacer"></div>
                <span class="multiple">[${multiple}倍]</span>
              </div>
            `
            } else {
              let htmlStr = ''
              danma.forEach((item, index) => {
                htmlStr += `
              <div class="order-line">
                <span class="index">${Index[index]}</span>
                <span class="dantuo">${item}<span class="sanjiao"></span>${tuoma.join('+')}</span>
                <div class="gap-spacer"></div>
                <span class="multiple">[${multiple}倍]</span>
              </div>
            `
              })
              return htmlStr
            }
          } else if (playMethodVal == '单选全胆拖') {
            return `
              <div class="order-line">
                <span class="index">${Index[0]}</span>
                <span class="dantuo">${danma.join('+')}<span class="sanjiao"></span>${tuoma.join('+')}</span>
                <div class="gap-spacer"></div>
                <span class="multiple">[${multiple}倍]</span>
              </div>
            `
          } else {
            return `
          <div class="order-line">
            <span class="dantuo">${danma.join('+')}<span class="sanjiao"></span>${tuoma.join('+')}</span>
            <div class="gap-spacer"></div>
            <span class="multiple">[${multiple}倍]</span>
          </div>
        `
          }
        } else if (/^选(?:[一二三四五六七八九]|十)单式$/.test(playMethodVal)) {
          const multiple = orders[0][2] // 获取倍数
          // console.log('order', orders[0][1])
          // console.log('beishu', multiple)
          const numbers = orders[0][1].sort((a, b) => a - b) // 对号码进行排序
          const colCount = Math.min(numbers.length, 10) 
          return `
          <div class='happy'><span class="top">①</span>
          <div class="happy-eight-grid" style="--cols:${colCount}">
            ${numbers.map((num) => `<span class="num">${padZero(num)}</span>`).join('')}
          </div><span class="multiple">[${multiple}倍]</span>
        </div>
        `
        } else {
          // 如果玩法不是单选，则numbers使用 + 连接
          // 否则使用空格连接
          const isSingleSelect = data.playMethod === '3D单选'
          const separator = isSingleSelect ? ' ' : '+'
          return orders
            .map(
              (order, index) => `
          <div class="order-line">
            <span class="index">${Index[index]}</span>
            <span class="numbers">${order.slice(1, 4).join(separator)}</span>
            <div class="gap-spacer"></div>
            <span class="multiple">[${order[4]}倍]</span>
          </div>
        `
            )
            .join('')
        }
      }

      // 注意：这里的CSS需要仔细调整以匹配你的布局需求
      // 使用内联样式或 <style> 标签
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
              }
              .receipt-container {
                  padding: 0; /* 上下留一点边距 */
                  width: 100%;
                  box-sizing: border-box;
                  min-height:310px;
                  overflow: hidden;
                  position: relative;
 
              }
              .top{
                  margin-top: -3px;
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
              .happy-eight-grid{
                  display: inline-grid;
                  grid-template-columns: repeat(var(--cols, 1), 20px);
                  gap: 2px 4px;
                  margin-left: 4px;
                  font-size: 16px;
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
                  ${generateOrderRows(data.orders)}
              </div>

              <div class="totals-line" ${isHappyEight ? 'style="text-align: left;"' : ''}>
                  <span>${isHappyEight ? `感谢您为公益事业贡献 ${data.contribute} 元` : `**感谢您为公益事业贡献 ${data.contribute} 元**`}</span>
              </div>

              <div class="footer-line">${data.machineCode}:${data.storeAddress}</div>
              <div class="footer-line">验票码:<span>${isHappyEight ? (data.verTicketCode || '').slice(0, 17) : data.verTicketCode}</span></div>
              ${!isHappyEight ? `<div class="footer-line">${data.lastPeriodData}</div>` : ''}

              ${
                data.barcodeData
                  ? `<div class="barcode-container"><img id="barcodeImg" src="data:image/png;base64,${data.barcodeData}" alt="Barcode"></div>`
                  : ''
              }
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
    // --- 构建HTML结束 ---

    try {
      const offsetX_mm = pixelsToMM(offsetX || 0)
      const offsetY_mm = pixelsToMM(offsetY || 0) // Convert vertical offset

      printWindow = getOrCreatePrintWindow()

      if (is.dev) {
        printWindow.webContents.openDevTools()
      }

      const htmlContent = generateHtml(receiptData, offsetX_mm, offsetY_mm)

      // 使用 loadURL 加载 data URI
      // await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
      // 使用 executeJavaScript 更新内容而不是重新加载
      await printWindow.webContents.executeJavaScript(`
        document.open();
        document.write(${JSON.stringify(htmlContent)});
        document.close();
        true;  // 返回值用于确认执行完成`)
      // 并行发送数据到后台
      const dataUploadPromise = (async () => {
        try {
          const machineId = machineIdSync()
          const { barcodeData, ticketSaleTime, ...paramsData } = receiptData
          paramsData.saleTime = paramsData.saleTime || ticketSaleTime
          paramsData.orders = JSON.stringify(paramsData.orders)
          paramsData.machineId = machineId

          const res = await net.fetch('https://armbian.chaofan.live/api/orders/create/', {
            method: 'POST',
            body: JSON.stringify(paramsData),
            headers: { 'Content-Type': 'application/json' }
          })
          console.log('打印数据发送成功')
        } catch (err) {
          console.error('数据上传错误:', err)
          // 不影响打印流程继续
        }
      })()
      // 执行打印
      const printSuccess = await new Promise((resolve) => {
        printWindow.webContents.print(
          {
            silent: options?.silent ?? true,
            printBackground: true,
            deviceName: printerName,
            margins: { marginType: 'none' }, // 改为 minimum
            color: false,
            scaleFactor: 100,
            pageSize: {
              width: 80000, // 80mm
              height: 300000 // 设为0让打印机自动计算高度
            }
          },
          (success) => resolve(success)
        )
      })

      // 等待页面完全加载（可选，但有时有帮助）
      await new Promise((resolve) => {
        printWindow.webContents.once('did-finish-load', resolve)
        // 设置超时以防万一
        setTimeout(resolve, 200)
      })

      console.log('HTML已加载，准备打印...')
      // 等待数据上传完成 (可选)
      await dataUploadPromise

      // 关闭窗口处理
      if (!is.dev) {
        // 避免立即关闭
        setTimeout(() => printWindow.loadURL('about:blank'), 100)
      }
      return { success: !!printSuccess }
      // 执行打印
      // const printSuccess = await new Promise((resolve) => {
      //   printWindow.webContents.print(
      //     {
      //       silent: options?.silent ?? true, // 默认静默打印
      //       printBackground: true, // 必须为 true 以打印样式
      //       deviceName: printerName,
      //       margins: { marginType: 'none' }, // 尝试无边距
      //       color: false, // 热敏打印机通常是黑白
      //       scaleFactor: 100, // 不缩放
      //       pageSize: {
      //         width: 80000,
      //         height: 300000 // 使用自动高度
      //       }
      //       // landscape: false, // 纵向
      //     },
      //     (success) => resolve(success)
      //   )
      //   // 这里监控 将数据发送到后台
      //   // 准备数据

      //   const machineId = machineIdSync()
      //   const { barcodeData, ticketSaleTime, ...paramsData } = receiptData
      //   paramsData.saleTime = paramsData.saleTime || ticketSaleTime
      //   paramsData.orders = JSON.stringify(paramsData.orders)
      //   paramsData.machineId = machineId // 添加机器码
      //   console.log(JSON.stringify(paramsData), 'paramsData')
      //   // 发送数据到后台
      //   net
      //     .fetch('https://armbian.chaofan.live/api/orders/create/', {
      //       method: 'POST',
      //       body: JSON.stringify(paramsData),
      //       headers: { 'Content-Type': 'application/json' }
      //     })
      //     .then((res) => {
      //       console.log(res, '打印数据发送成功')
      //     })
      // })
      // const printSuccess = null
      // 等待一小段时间确保打印任务进入队列，然后关闭窗口
      // await new Promise((resolve) => setTimeout(resolve, 200))
      // if (!is.dev) {
      //   printWindow.close()
      // }
      // if (printSuccess) {
      //   return { success: true }
      // } else {
      //   return { success: false, error: '打印任务发送失败' }
      // }
    } catch (error) {
      console.error('打印HTML小票失败:', error)
      return { success: false, error: error.message }
    }
  }
)

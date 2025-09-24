import { useState, useEffect } from 'react'
import {
  Button, Layout, Space, Typography, Select, Input, message, Checkbox, Tabs,InputNumber 
} from 'antd'
import dayjs from 'dayjs'
import html2canvas from 'html2canvas'

import Order from '../components/order'
import Positioning from '../components/positioning'
import Duplex from '../components/duplex'
import TwoD from '../components/twod'
import DragCode from '../components/dragCode'
import HappyEight from '../components/happyEight'
import EightSignleSelect from '../components/eightSignleSelect'
import EightDoubleSelect from '../components/eightDoubleSelect'
import { httpRequest } from '../utils/httpRequest'
import { getStrCode, getVerTicketCode } from '../utils/tools'
import { buildPreviewHtml ,pixelsToMM} from '../utils/receiptTemplate'
import { printHtmlTicket } from '../utils/print'   // 新增引入

import { usePersistedInfo } from '../hooks/usePersistedInfo'
import { useSerialNumber } from '../hooks/useSerialNumber'
import { usePlayConfig } from '../hooks/usePlayConfig'
import { useOrders } from '../hooks/useOrders'
import { useReceiptBuilder } from '../hooks/useReceiptBuilder'

const { Content } = Layout
const PLAY_RENDER_REGISTRY = {
  '3D': {
    '单选':      { type: 'multi', component: Order },
    '组选三':    { type: 'multi', component: Order },
    '组选六':    { type: 'multi', component: Order },
    '定位':      { type: 'single', component: Positioning },
    '复式':      { type: 'single', component: Duplex },
    '2D':        { type: 'multi', component: TwoD },
    '胆拖':      { type: 'single', component: DragCode }
  },
  '快乐8': {
    // 根据你实际的选项名同时兼容
    '单式':        { type: 'single', component: EightSignleSelect },// 若后面只用“单式”
    '复式':        { type: 'single', component: EightDoubleSelect },
    '胆拖':      { type: 'single', component: HappyEight }
  }
}

function PrintMain() {
  const [messageApi, contextHolder] = message.useMessage();
  const { formData, handleInputChange, setFormData } = usePersistedInfo()
  const { tmpSerialNumber, setTmpSerialNumber, getNextSerial, setSerial } = useSerialNumber()
  const {
    playType, playClass, playMethodOptions, handleTabChange, handlePlayTypeChange
  } = usePlayConfig((onlyOrders) => {
    clearOrders()
    if (!onlyOrders) {
      setShowPreview(false)
      setImgSrc(null)
    }
  })

  const { orderKeys, orderValues, setOrder, resetOrders, validOrders, totals } =
    useOrders(playClass,playType)

  const [strCode, setStrCode] = useState('')
  const [verTicketCode, setVerTicketCode] = useState('')
  const [lastPeriodData, setLastPeriodData] = useState(null)
  const [imgSrc, setImgSrc] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // 同步 totals 到 formData（如需存储）
  useEffect(() => {
    setFormData(p => ({ ...p, price: totals.price, contribute: totals.contribute }))
  }, [totals, setFormData])

  // 初始化串码
  useEffect(() => {
    setStrCode(getStrCode())
    setVerTicketCode(getVerTicketCode())
  }, [])

  const clearOrders = () => {
    resetOrders()
    setTmpSerialNumber('')
    handleInputChange('saleTime', '')
  }

  // 开奖数据
  const DRAW_NOTICE_BASE_URL =
    'https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice'
  const playClassParamMap = { '3D': '3d', '快乐8': 'kl8' }

  useEffect(() => {
    
      const param = playClassParamMap[playClass]
      if (!param) return
      const url = `${DRAW_NOTICE_BASE_URL}?name=${param}&issueCount=&issueStart=&issueEnd=&dayStart=&dayEnd=&pageNo=1&pageSize=30&week=&systemType=PC`
      httpRequest({ url, method: 'GET' })
        .then(res => {
          const data = res?.result?.[0]
          if (data) {
            handleInputChange(
              'drawNumber',
              `第${data.code}期开奖号码: ${data.red.split(',').join(' ')}`
            )
            const year = dayjs().format('YYYY')
            let curr = data.code.replace(year, '')
            curr = (parseInt(curr, 10) + 1).toString().padStart(3, '0')
            handleInputChange('salePeriod', `${year}${curr}`)
            setLastPeriodData(data)
          }
        })
        .catch(() => {})
    
  }, [playClass, handleInputChange])

  const updateDrawPeriod = () => {
    setLastPeriodData(null)
    handleInputChange('saleTime', dayjs().format('YYYY/MM/DD-HH:mm:ss'))
  }

  // 构建票据数据
  const { buildReceiptData } = useReceiptBuilder({
    playType,
    playClass,
    formData: { ...formData, price: totals.price, contribute: totals.contribute },
    validOrders,
    lastPeriodData,
    tmpSerialNumber,
    getNextSerial,
    strCode,
    verTicketCode
  })

  // 预览
  const previewHtmlTemplate = async () => {
    const data = await buildReceiptData()
    if (!data) {
      messageApi.warning('未下注')
      return
    }
    setShowPreview(true)
    let root = document.getElementById('html-ticket-preview-root')
    if (!root) {
      root = document.createElement('div')
      root.id = 'html-ticket-preview-root'
      root.style.position = 'fixed'
      root.style.left = '-9999px'
      root.style.top = '0'
      document.body.appendChild(root)
    }
    root.innerHTML = buildPreviewHtml(data)
    const node = root.querySelector('.receipt-container')
    const shot = await html2canvas(node, {
      scale: 2, backgroundColor: '#fff', useCORS: true
    })
    setImgSrc(shot.toDataURL('image/png'))
  }

  const printThis = async () => {
    const data = await buildReceiptData()
    if (!data) {
      messageApi.warning('无有效投注')
      return
    }
    const hasZuXuan3 = data.orders.some(order => order[0] === '组选三')
    const hasZuXuan6 = data.orders.some(order => order[0] === '组选六')
    if (hasZuXuan3 && hasZuXuan6) {
      messageApi.error('非法票据：不能同时包含组选三和组选六')
      return
    }
    try {
      await printHtmlTicket(data, offsetX)
      messageApi.success('打印成功')
      // clearOrders()
      setShowPreview(false)
      setImgSrc(null)
    } catch (err) {
      messageApi.error('打印失败: ' + err.message)
    }
  }

    const renderPlayComponent = () => {
    const group = PLAY_RENDER_REGISTRY[playClass] || {}
    const cfg = group[playType]
    if (!cfg) return null
    if (cfg.type === 'multi') {
      return orderKeys.map((k, i) => {
        const Cmp = cfg.component
        return (
          <Cmp
            key={k}
            playType={playType}
            onChange={(v) => setOrder(i, v)}
          />
        )
      })
    }
    const Cmp = cfg.component
    return (
      <Cmp
        key={orderKeys[0]}
        playType={playType}
        onChange={(v) => setOrder(0, v)}
      />
    )
  }
    // eslint-disable-next-line no-undef
   const isDev = import.meta.env.DEV
   const getStoredNumber = (key, defaultValue = 0) => {
    try {
      const storedValue = localStorage.getItem(key)
      // Check if storedValue is not null/undefined and is a valid number string
      if (storedValue !== null && storedValue !== undefined && !isNaN(Number(storedValue))) {
        return Number(storedValue)
      }
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error)
    }
    return defaultValue // Return default if not found or invalid
  }
  const saveStoredNumber = (key, value) => {
    try {
      // Ensure value is a number before saving
      if (typeof value === 'number' && !isNaN(value)) {
        localStorage.setItem(key, String(value))
      } else {
        // Optionally remove the item if the value is invalid/null
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error)
    }
  }
 const [offsetX, setOffsetX] = useState(() => getStoredNumber('printOffsetX', 0))

  // Function to handle offsetX change and save to localStorage
  const handleOffsetXChange = (value) => {
    const numValue = value || 0 // Ensure it's a number, default to 0
    setOffsetX(numValue)
    saveStoredNumber('printOffsetX', numValue) // Save to localS
  }
  return (
    <Content style={{ padding: 10, width: '100vw', background: '#fff' }}>
       {contextHolder}
      <Tabs defaultActiveKey="1" onChange={handleTabChange}
        items={[{ key: '1', label: '3D' }, { key: '2', label: '快乐8' }]} />
      <Space direction="vertical" size="small">
        <Space wrap>
          <label>玩法</label>
          <Select
            value={playType}
            size="small"
            style={{ width: 90 }}
            onChange={handlePlayTypeChange}
            options={playMethodOptions}
          />
                  <label htmlFor="">机号</label>
              <Input
                value={formData.machineCode}
                size="small"
                onChange={(e) => handleInputChange('machineCode', e.target.value)}
              />
                              <label htmlFor="offsetXInput">右偏移(像素):</label>
                <InputNumber
                  id="offsetXInput"
                  min={0}
                  value={offsetX}
                  // Use the new handler function
                  onChange={handleOffsetXChange}
                  size="small"
                  style={{ width: 80 }}
                />
        </Space>

        <Space wrap>
          <label>串码 {strCode}</label>
          <Button onClick={() => {
            clearOrders()
            setImgSrc(null)
            setShowPreview(false)
          }} type="primary">清空</Button>
        </Space>

        {renderPlayComponent()}

        <Space wrap>
          <label>价格:{totals.price}</label>
          <label>贡献:{totals.contribute}</label>
        </Space>

        <Space wrap>
          <label>上期号</label>
          <Input
            value={formData.drawNumber}
            onChange={(e) => handleInputChange('drawNumber', e.target.value)}
          />
          <Button size="small" type="primary" onClick={updateDrawPeriod}>更新</Button>
        </Space>

        <Space wrap>
          <label>销售期</label>
          <Input
            value={formData.salePeriod}
            onChange={(e) => handleInputChange('salePeriod', e.target.value)}
          />
          <label>销售时间</label>
          <Input
            value={formData.saleTime}
            onChange={(e) => handleInputChange('saleTime', e.target.value)}
          />
        </Space>

        <Space wrap>
          <label>地址</label>
          <Input
            value={formData.storeAddress}
            onChange={(e) => handleInputChange('storeAddress', e.target.value)}
          />
        </Space>

        <Space wrap>
          <label>流水号</label>
          <Input
            value={tmpSerialNumber}
            onChange={(e) => {
              setTmpSerialNumber(e.target.value)
              setSerial(e.target.value)
            }}
          />
          <Checkbox
            checked={formData.activity}
            onChange={(e) => handleInputChange('activity', e.target.checked)}
          >
            活动
          </Checkbox>
          <Input
            value={formData.copywriting}
            onChange={(e) => handleInputChange('copywriting', e.target.value)}
            placeholder="活动文案"
          />
        </Space>

        <div>
          <Button type="primary" onClick={printThis} style={{ marginRight: 8 }}>打印</Button>
          {isDev && (
            <Button type="primary" onClick={previewHtmlTemplate} style={{ marginRight: 8 }}>
              打印预览
            </Button>
          )}
          {isDev && showPreview && imgSrc && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Typography.Title level={5}>打印预览效果 (开发模式)</Typography.Title>
              <img
                src={imgSrc}
                alt="预览"
                style={{
                  maxWidth: 400,
                  border: '1px solid #eee',
                  background: '#fff',
                  boxShadow: '0 2px 8px #eee',
                  margin: '0 auto'
                }}
              />
            </div>
          )}
        </div>
      </Space>
    </Content>
  )
}

export default PrintMain
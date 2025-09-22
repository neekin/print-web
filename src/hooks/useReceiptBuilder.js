import dayjs from 'dayjs'
import { generateBarcode } from '../utils/tools'

export function useReceiptBuilder(deps) {
  const {
    playType,
    formData,
    validOrders,
    lastPeriodData,
    tmpSerialNumber,
    getNextSerial,
    strCode,
    verTicketCode, 
    playClass
  } = deps

  const resolvePlayMethod = (orders) => {
    let pm = playType
    const has3 = orders.some(o => o[0] === '组选三')
    const has6 = orders.some(o => o[0] === '组选六')
    if (has3 && has6) pm = '3D组选'
    else if (has3) pm = '3D组选三'
    else if (has6) pm = '3D组选六'
    else if (playType === '定位') pm = '3D复式'
    else if (playType === '2D') pm = '猜2D'
    else if (playType === '单选') pm = '3D单选'
    else if (['复式', '胆拖'].includes(playType)) pm = orders[0][0]
    return pm
  }

  const buildReceiptData = async () => {
    const orders = validOrders()
    if (!orders.length) return null
    const playMethod = resolvePlayMethod(orders)
    const barcodeDataUrl = await generateBarcode(strCode + verTicketCode)
    return {
      playClass,
      strCode,
      verTicketCode,
      serialNumber: tmpSerialNumber || getNextSerial(),
      salePeriod: formData.salePeriod,
      saleTime: formData.saleTime,
      price: formData.price,
      contribute: formData.contribute,
      playMethod,
      machineCode: formData.machineCode,
      storeAddress: formData.storeAddress,
      lastPeriodText:
        formData.drawNumber ||
        (lastPeriodData
          ? `第${lastPeriodData.code}期开奖号码: ${lastPeriodData.red.split(',').join(' ')}`
          : ''),
      orders,
      ticketSaleTime: dayjs().format('YYYY/MM/DD-HH:mm:ss'),
      drawTime: dayjs().format('YYYY/MM/DD'),
      barcodeData: barcodeDataUrl,
      copywriting: formData.activity ? formData.copywriting : ''
    }
  }

  return { buildReceiptData }
}
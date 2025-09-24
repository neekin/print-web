import dayjs from 'dayjs'
import { useState } from 'react'

export function useSerialNumber() {
  const [tmpSerialNumber, setTmpSerialNumber] = useState('')
  const key = () => dayjs().format('YYYYMMDD')

  const getNextSerial = () => {
    const k = key()
    const val = localStorage.getItem(k)
    let next
    if (!val) {
      next = 1
    } else {
      next = parseInt(val, 10) + 1
    }
    localStorage.setItem(k, next.toString())
    return next
  }

  const setSerial = (num) => {
    const k = key()
    if (num) {
      localStorage.setItem(k, num)
      return
    }
    const val = localStorage.getItem(k)
    if (!val) localStorage.setItem(k, '1')
    else localStorage.setItem(k, (parseInt(val, 10) + 1).toString())
  }

  return { tmpSerialNumber, setTmpSerialNumber, getNextSerial, setSerial }
}
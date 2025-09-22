import { useState, useCallback, useEffect } from 'react'

/**
 * 新增 playClass 参数：区分 3D 与 快乐8 下同名玩法（如“单式”）
 * 调用：useOrders(playClass, playType, priceUnit, contributeUnit)
 */
export function useOrders(playClass, playType, priceUnit = 2, contributeUnit = 0.68) {
  const [orderKeys, setOrderKeys] = useState([1, 2, 3, 4, 5])
  const [orderValues, setOrderValues] = useState([null, null, null, null, null])
  const [totals, setTotals] = useState({ price: '0.00', contribute: '0.00' })

  const combination = (n, k) => {
    if (k < 0 || k > n) return 0
    k = Math.min(k, n - k)
    let r = 1
    for (let i = 1; i <= k; i++) r = (r * (n - i + 1)) / i
    return r
  }
  const permutation3 = (n) => (n < 3 ? 0 : n * (n - 1) * (n - 2))

  const setOrder = useCallback((index, value) => {
    setOrderValues(prev => {
      if (JSON.stringify(prev[index]) === JSON.stringify(value)) return prev
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const resetOrders = useCallback(() => {
    setOrderKeys(prev => prev.map(() => Math.random()))
    setOrderValues([null, null, null, null, null])
  }, [])

  const validOrders = () => orderValues.filter(v => v !== null)

  useEffect(() => {
    const valid = validOrders()
    if (!valid.length) {
      setTotals({ price: '0.00', contribute: '0.00' })
      return
    }

    let totalPrice = 0
    let totalContribute = 0

    // 3D 常规（单选 / 组选三 / 组选六 / 2D）与原逻辑一致
    if (playClass === '3D' && ['单选', '组选三', '组选六', '2D'].includes(playType)) {
      const totalMultip = valid.reduce(
        (s, arr) => s + (arr ? (parseInt(arr[arr.length - 1], 10) || 1) : 1),
        0
      )
      totalPrice = totalMultip * priceUnit
      totalContribute = totalMultip * contributeUnit
    }
    else if (playClass === '3D' && playType === '定位') {
      const d = valid[0]
      if (d) {
        const selected = d.slice(1, 4)
        const note = selected.reduce((p, list) => p * list.length, 1)
        const mult = d[4]
        totalPrice = note * priceUnit * mult
        totalContribute = note * mult * contributeUnit
      }
    }
    else if (playClass === '3D' && playType === '复式') {
      const v = valid[0]
      if (v) {
        const pm = v[0]
        const nums = v[1]
        const mult = v[2]
        let note = 0
        if (pm === '组三复式') note = combination(nums.length, 2) * 2
        else if (pm === '组六复式') note = combination(nums.length, 3)
        else if (pm === '单选单复式') note = permutation3(nums.length)
        else if (pm === '单选双复式') {
          const n = nums.length
            note = n * (n - 1) * 3
        }
        totalPrice = note * priceUnit * mult
        totalContribute = note * mult * contributeUnit
      }
    }
    else if (playClass === '3D' && playType === '胆拖') {
      const d = valid[0]
      if (d) {
        const pm = d[0]
        const danma = d[1] || []
        const tuoma = d[2] || []
        const mult = d[3]
        let note = 0
        const k = tuoma.length
        const overlap = danma.some(x => tuoma.includes(x))
        if (!overlap) {
          if (pm === '组三胆拖') {
            if (danma.length === 1) note = 2 * k
            else if (danma.length === 2) note = k
          } else if (pm === '组六胆拖') {
            if (danma.length === 1) note = combination(k, 2)
            else if (danma.length === 2) note = k
          } else if (pm === '组六单选胆拖') {
            if (danma.length === 1) note = combination(k, 2) * 6
            else if (danma.length === 2) note = 2 * combination(k, 2) * 6
          } else if (pm === '组三单选胆拖') {
            if (danma.length === 1) note = k * 2
            else if (danma.length === 2) {
              note = danma[0] === danma[1] ? k * 2 : 2 * k * 6
            }
          } else if (pm === '单选全胆拖') {
            if (danma.length === 1) note = 1 + 6 * k + 3 * k * (k - 1)
            else if (danma.length === 2) {
              note = danma[0] === danma[1] ? 1 + 3 * k : 6 + 6 * k
            }
          }
        }
        totalPrice = note * priceUnit * mult
        totalContribute = note * mult * contributeUnit
      }
    }
    // 快乐8 - 单式（聚合结构：['选X单式', [ [ [nums...], multiple], ... ]]）
    else if (playClass === '快乐8' && playType === '单式') {
      // 兼容旧/意外结构：只取第一条聚合
      const agg = valid[0]
      // 判定形态
      if (Array.isArray(agg) && /^选[一二三四五六七八九十]单式$/.test(agg[0]) && Array.isArray(agg[1])) {
        const lines = agg[1]
          .filter(line => Array.isArray(line) && Array.isArray(line[0]) && line[0].length > 0)
        if (lines.length) {
          // 每行：一个注 * 行倍数
          const sumMult = lines.reduce((s, line) => {
            const m = parseInt(line[1], 10)
            return s + (isNaN(m) ? 1 : m)
          }, 0)
          totalPrice = sumMult * priceUnit
          totalContribute = totalPrice * 0.3
        }
      } else {
        // 兜底（若误传为多条散列订单，每条最后一位是倍数）
        const totalMultip = valid.reduce(
          (s, arr) => s + (arr ? (parseInt(arr[arr.length - 1], 10) || 1) : 1),
          0
        )
        totalPrice = totalMultip * priceUnit
        totalContribute = totalPrice * 0.3
      }
    }
    // 其它（保持原默认兜底：当成普通“单注 * 倍数”）
    else {
      const totalMultip = valid.reduce(
        (s, arr) => s + (arr ? (parseInt(arr[arr.length - 1], 10) || 1) : 1),
        0
      )
      totalPrice = totalMultip * priceUnit
      totalContribute = totalMultip * contributeUnit
    }

    setTotals({
      price: totalPrice.toFixed(2),
      contribute: totalContribute.toFixed(2)
    })
  }, [orderValues, playClass, playType, priceUnit, contributeUnit])

  return {
    orderKeys,
    orderValues,
    setOrder,
    resetOrders,
    validOrders,
    totals
  }
}
import { useState, useEffect } from 'react'

const threeDplay = [
  { value: '单选', label: '单选' },
  { value: '组选三', label: '组选三' },
  { value: '组选六', label: '组选六' },
  { value: '定位', label: '定位' },
  { value: '复式', label: '复式' },
  { value: '2D', label: '2D' },
  { value: '胆拖', label: '胆拖' }
]
const happyEightOptions = [{ value: '单式', label: '单式' },{value: '复式', label: '复式'},{value: '胆拖', label: '胆拖'}]

export function usePlayConfig(onClear) {
  const [playType, setPlayType] = useState('单选')
  const [playClass, setPlayClass] = useState('3D')
  const [playMethodOptions, setPlayMethodOptions] = useState([])

  useEffect(() => { setPlayMethodOptions(threeDplay) }, [])
  useEffect(() => {
    if (playMethodOptions.length > 0) setPlayType(playMethodOptions[0].value)
  }, [playMethodOptions])

  const handleTabChange = (key) => {
    if (key === '1') {
      setPlayMethodOptions(threeDplay)
      setPlayClass('3D')
    } else {
      setPlayMethodOptions(happyEightOptions)
      setPlayClass('快乐8')
    }
    onClear && onClear()
  }

  const handlePlayTypeChange = (val) => {
    setPlayType(val)
    if (['定位', '复式', '2D', '胆拖'].includes(val)) {
      onClear && onClear(true) // 清空投注
    }
  }

  return {
    playType,
    playClass,
    playMethodOptions,
    handleTabChange,
    handlePlayTypeChange,
    threeDplay,
    happyEightOptions
  }
}
import { useState, useEffect } from 'react'
import { Checkbox, Select, InputNumber } from 'antd'

const Duplex = ({ onChange = () => {} }) => {
  const numberOptions = Array.from({ length: 10 }, (_, i) => `${i}`)

  const [multiple, setMultiple] = useState(1)
  const [selectedNums, setSelectedNums] = useState([])
  const [play, setPaly] = useState('组三')
  const handleChange = (values) => {
    setSelectedNums(values)
  }
  useEffect(() => {
    // 如果是组三复式，selectedNums的length必须大于4
    if (play == '组三' && selectedNums.length >= 3) {
      onChange(['组三复式', selectedNums, multiple])
      return
    }
    if (play == '组六' && selectedNums.length >= 3) {
      onChange(['组六复式', selectedNums, multiple])
      return
    }
    if (play == '单选单复式' && selectedNums.length >= 3 && selectedNums.length <= 8) {
      onChange(['单选单复式', selectedNums, multiple])
      return
    }
    if (play == '单选双复式' && selectedNums.length >= 2 && selectedNums.length <= 10) {
      onChange(['单选双复式', selectedNums, multiple])
      return
    }
    onChange(null)
  }, [selectedNums, multiple, onChange, play])
  return (
    <>
      <Select
        value={play}
        size="small"
        style={{ width: 90, marginRight: 10 }}
        onChange={(e) => {
          setPaly(e)
        }}
        tabIndex={-1}
        options={[
          {
            value: '组三',
            label: '组三'
          },
          {
            value: '组六',
            label: '组六'
          },
          {
            value: '单选单复式',
            label: '单选单复式'
          },
          {
            value: '单选双复式',
            label: '单选双复式'
          }
        ]}
      />
      <Checkbox.Group options={numberOptions} onChange={handleChange} />
      <br />
      <br />
      倍数:
      <InputNumber
        style={{ width: 60 }}
        min={1}
        value={multiple}
        size="small"
        onChange={(val) => {
          setMultiple(val)
        }}
      />
    </>
  )
}

export default Duplex

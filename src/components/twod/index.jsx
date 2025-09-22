import { useEffect, useState, useRef } from 'react'
import { Select, Space, Input, InputNumber, Alert } from 'antd'
const TwoD = ({ onChange = () => {}, playType = '2D' }) => {
  const [value, setValue] = useState('')
  const [multiple, setMultiple] = useState(1)
  const [play, setPaly] = useState(playType)
  useEffect(() => {
    setPaly(playType)
  }, [playType])

  useEffect(() => {
    if (multiple == null) return
    if (value && value.length == 2) {
      let finalValue = value
      const sortedArray = [...value].sort((a, b) => a - b)
      // 转回字符串
      finalValue = sortedArray.join('')
      onChange([play, ...finalValue, multiple])
    } else {
      onChange(null)
      setState(null)
    }
  }, [value, multiple, play, onChange])
  const inputRef = useRef(null)
  // 根据传入的playType确定选项
  const getOptions = () => {
    return [
      {
        value: '2D',
        label: '2D'
      }
    ]
  }
  const [state, setState] = useState(null)

  // const inputRef = useRef(null) // Ref for Input.OTP
  const multipleInputRef = useRef(null) // 新增：Ref for InputNumber
  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          value={play}
          size="small"
          style={{ width: 90 }}
          onChange={(e) => {
            setPaly(e)
          }}
          tabIndex={-1}
          options={getOptions()}
        />
        <Input.OTP
          ref={inputRef}
          style={{ width: 180 }}
          size="small"
          formatter={(str) => str.toUpperCase()}
          length={2}
          onInput={(e) => setValue(e)}
          onChange={(value) => {
            setValue(value)
            if (value && value.length === 2 && multipleInputRef.current) {
              multipleInputRef.current.focus()
            }
          }}
        />
        <label htmlFor="">倍数:</label>{' '}
        <InputNumber
          style={{ width: 60 }}
          ref={multipleInputRef}
          min={1}
          value={multiple}
          size="small"
          onChange={(val) => {
            setMultiple(val)
          }}
        />
      </Space>
      {state ? <Alert message="输入错误" type="error" /> : ''}
    </div>
  )
}

export default TwoD

import { useEffect, useState, useRef } from 'react'
import { Select, Space, Input, InputNumber, Alert } from 'antd'
const Order = ({ onChange = () => {}, playType = '单选' }) => {
  const [value, setValue] = useState('')
  const [multiple, setMultiple] = useState(1)
  const [play, setPaly] = useState(playType)
  useEffect(() => {
    setPaly(playType)
  }, [playType])

  useEffect(() => {
    if (multiple == null) return
    if (value && value.length == 3) {
      let finalValue = value
      if (play != '单选') {
        const sortedArray = [...value].sort((a, b) => a - b)
        // 转回字符串
        finalValue = sortedArray.join('')
      }
      let err = null
      getRules()?.forEach((rule) => {
        if (!rule.pattern.test(finalValue)) {
          setState(true)
          err = rule.message
        } else {
          setState(false)
        }
      })
      onChange([play, ...finalValue, multiple, ...(err ? [err] : [])])
    } else {
      onChange(null)
      setState(null)
    }
  }, [value, multiple, play, onChange])
  const inputRef = useRef(null)
  // 根据传入的playType确定选项
  const getOptions = () => {
    if (play === '组选三') {
      return [
        {
          value: '组选三',
          label: '组选三'
        },
        {
          value: '组选六',
          label: '组选六'
        }
      ]
    } else if (play == '组选六') {
      return [
        {
          value: '组选六',
          label: '组选六'
        }
      ]
    } else {
      return [
        {
          value: '单选',
          label: '单选'
        }
      ]
    }
  }
  const [state, setState] = useState(null)

  // 生成校验规则 组三 如果 玩法是组选三 选项是3个数字 必须得有两个且只有两个重复数字
  const getRules = () => {
    if (play === '组选三') {
      // 判断这个字符串是否有两个且只有两个重复数字
      return [
        {
          pattern: /^(?!(?:.*(\d).*?\1.*?\1))(?=.*(\d).*?\2)\d*$/,
          message: '组三'
        }
      ]
    }
    // 组选六 选项是3个数字 且不能有重复的数字
    if (play === '组选六') {
      return [
        {
          pattern: /^(?!.*(.).*\1)\d*$/,
          message: '组六'
        }
      ]
    }
  }



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
          length={3}
          onInput={(e) => setValue(e)}
          onChange={(value) => {
            setValue(value)
            if (value && value.length === 3 && multipleInputRef.current) {
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

export default Order

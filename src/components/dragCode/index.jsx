import { useState, useEffect, useMemo } from 'react'
import { Checkbox, Select, InputNumber, Input, Form, Alert } from 'antd'

const DragCode = ({ onChange = () => { } }) => {
  const baseNumberOptions = useMemo(() => Array.from({ length: 10 }, (_, i) => `${i}`), [])
  const [multiple, setMultiple] = useState(1)
  const [danmaValue, setDanmaValue] = useState([])
  const [tuomaValue, setTuomaValue] = useState([])
  const [danmaError, setDanmaError] = useState(null)
  const [play, setPaly] = useState('组三')
  // --- Validation Logic ---
  const validateDanma = (currentDanma, currentTuoma) => {
    // 确保 currentDanma 是字符串
    if (play.includes('组六') && currentDanma.length === 2) {
      if (currentDanma[0] === currentDanma[1]) {
        return '组六胆拖的胆码不能重复'
      }
    }

    if (currentDanma.length > 0) {
      // 确保 digit 不是空字符串，并检查是否包含在拖码中
      const conflict = currentDanma.some((digit) => digit && currentTuoma.includes(digit))
      if (conflict) {
        return '胆码和拖码不能包含相同数字'
      }
    }
    // 检查胆码是否有非数字的特殊符号 currentDanma是一个数组哦
    const hasInvalidChars = currentDanma.some((digit) => digit && !baseNumberOptions.includes(digit))
    if (hasInvalidChars) {  
      return '胆码只能是0-9的数字'
    }
    return null // 无错误
  }

  // --- Event Handlers ---
  // 使用 onChange，它在 Input.OTP 值改变时触发
  const handleDanmaChange = (value) => {
    const newValue = value || ''
    setDanmaValue(newValue)
    const error = validateDanma(newValue, tuomaValue)
    setDanmaError(error)
  }

  const handleTuomaChange = (values) => {
    const newValues = values || []
    setTuomaValue(newValues)
    const error = validateDanma(danmaValue, newValues)
    setDanmaError(error)
  }

  const handleMultipleChange = (val) => {
    setMultiple(val > 0 ? val : 1)
  }

  // --- Generate Dynamic Options for 拖码 ---
  const getDynamicOptions = (disabledValues) => {
    // 确保 disabledValues 是字符串数组
    const disabledStrings = Array.isArray(disabledValues)
      ? disabledValues.filter((v) => v).map(String)
      : []
    return baseNumberOptions.map((num) => ({
      label: num,
      value: num,
      // 检查当前数字字符串是否包含在禁用列表中
      disabled: disabledStrings.includes(num)
    }))
  }

  // 从胆码输入中获取当前数字用于禁用拖码选项
  const danmaDigitsForDisabling = useMemo(() => String(danmaValue || '').split(''), [danmaValue])
  const tuomaOptions = useMemo(
    () => getDynamicOptions(danmaDigitsForDisabling),
    [danmaDigitsForDisabling, baseNumberOptions]
  )

  // --- useEffect to notify parent component ---
  useEffect(() => {
    // 检查完成性和有效性。
    // 胆码长度为 1 或 2 都视为有效
    const isDanmaLengthValid = danmaValue.length === 1 || danmaValue.length === 2
    const isTuomaSelected = tuomaValue.length + danmaValue.length >= 3 // 至少选择 3 个数字
    const isValid = danmaError === null // 无验证错误

    // 条件：胆码长度有效、拖码已选、且无验证错误
    if (isDanmaLengthValid && isTuomaSelected && isValid) {
      // 传递数据
      onChange([`${play}胆拖`, [...danmaValue], tuomaValue, multiple])
    } else {
      // 传递 null 表示无效或未完成
      onChange(null)
    }
  }, [danmaValue, tuomaValue, multiple, danmaError, onChange])

  return (
    <>
      <Form.Item
        label="玩法"
        validateStatus={danmaError ? 'error' : ''}
        style={{ marginBottom: '8px' }}
      >
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
              value: '单选全',
              label: '单选'
            },
            {
              value: '组三',
              label: '组三'
            },
            {
              value: '组六',
              label: '组六'
            },
            {
              value: '组三单选',
              label: '组三单选'
            },
            {
              value: '组六单选',
              label: '组六单选'
            }
          ]}
        />
      </Form.Item>
      <Form.Item
        label="胆码"
        validateStatus={danmaError ? 'error' : ''}
        style={{ marginBottom: '8px' }}
      >
        <Input.OTP
          style={{ width: 180 }}
          size="small"
          // 仍然建议使用 onChange
          onInput={handleDanmaChange}
          length={2}
        />
      </Form.Item>
      {danmaError && (
        <Alert message={danmaError} type="error" showIcon style={{ marginBottom: '8px' }} />
      )}

      <Form.Item label="拖码" style={{ marginBottom: '8px' }}>
        <Checkbox.Group
          options={tuomaOptions}
          value={tuomaValue}
          onChange={handleTuomaChange}
          tabIndex={-1}
        />
      </Form.Item>

      <Form.Item label="倍数" style={{ marginBottom: '0' }}>
        <InputNumber
          style={{ width: 60 }}
          min={1}
          value={multiple}
          size="small"
          onChange={handleMultipleChange}
        />
      </Form.Item>
    </>
  )
}

export default DragCode

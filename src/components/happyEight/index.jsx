import { Checkbox, Button, InputNumber } from 'antd'
import { useState } from 'react'
import PropTypes from 'prop-types'

const HappyEight = ({ onChange }) => {
  const numberOptions = Array.from({ length: 80 }, (_, i) => `${i + 1}`)
  const [danmaValues, setDanmaValues] = useState([])
  const [tuomaValues, setTuomaValues] = useState([])
  const [multiple, setMultiple] = useState(1)
  const [isDanmaCollapsed, setIsDanmaCollapsed] = useState(false)
  const [isTuomaCollapsed, setIsTuomaCollapsed] = useState(false)

  const handleDanmaChange = (checkedValues) => {
    // 限制胆码最多选择4个
    if (checkedValues.length <= 4) {
      setDanmaValues(checkedValues)

      // 如果胆码不足4个，清空拖码
      if (checkedValues.length < 4) {
        setTuomaValues([])
      } else {
        // 胆码满4个时，清理拖码中与胆码重复的项
        const filteredTuoma = tuomaValues.filter((value) => !checkedValues.includes(value))
        setTuomaValues(filteredTuoma)
      }

      // 回调给父组件
      const tuomaResult =
        checkedValues.length === 4
          ? tuomaValues.filter((value) => !checkedValues.includes(value))
          : []
      onChange &&
        onChange(tuomaResult.length > 0 ? ['快乐8', checkedValues, tuomaResult, multiple] : null)
    }
  }

  const handleTuomaChange = (checkedValues) => {
    // 过滤掉已选择的胆码
    const filteredValues = checkedValues.filter((value) => !danmaValues.includes(value))
    setTuomaValues(filteredValues)
    // 回调给父组件
    onChange &&
      onChange(filteredValues.length > 0 ? ['快乐8', danmaValues, filteredValues, multiple] : null)
  }

  // 全拖按钮点击事件
  const handleSelectAllTuoma = () => {
    // 选择所有不在胆码中的数字
    const allAvailableValues = numberOptions.filter((option) => !danmaValues.includes(option))
    setTuomaValues(allAvailableValues)
    // 回调给父组件
    onChange &&
      onChange(
        allAvailableValues.length > 0 ? ['快乐8', danmaValues, allAvailableValues, multiple] : null
      )
  }

  // 胆码是否已选择4个
  const isDanmaComplete = danmaValues.length === 4

  // 拖码选项（包含所有数字，但重复的会被禁用）
  const tuomaOptions = numberOptions.map((option) => ({
    label: option,
    value: option,
    disabled: danmaValues.includes(option) // 与胆码重复的禁用
  }))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>胆码: ({danmaValues.length}/4)</span>
        <Button
          type="link"
          size="small"
          onClick={() => setIsDanmaCollapsed(!isDanmaCollapsed)}
          style={{ padding: 0 }}
        >
          {isDanmaCollapsed ? '展开' : '收起'}
        </Button>
        {isDanmaCollapsed && danmaValues.length > 0 && (
          <span style={{ color: '#1890ff' }}>已选: {danmaValues.join(', ')}</span>
        )}
      </div>
      {!isDanmaCollapsed && (
        <div>
          <Checkbox.Group
            options={numberOptions}
            value={danmaValues}
            onChange={handleDanmaChange}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: '8px',
              width: '100%'
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>拖码:</span>
        {!isDanmaComplete && <span style={{ color: '#999' }}>(请先选择4个胆码)</span>}
        {isDanmaComplete && (
          <>
            <Button type="link" size="small" onClick={handleSelectAllTuoma} style={{ padding: 0 }}>
              全拖
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => setIsTuomaCollapsed(!isTuomaCollapsed)}
              style={{ padding: 0 }}
            >
              {isTuomaCollapsed ? '展开' : '收起'}
            </Button>
          </>
        )}
        {isTuomaCollapsed && tuomaValues.length > 0 && (
          <span style={{ color: '#1890ff', fontSize: '12px' }}>
            已选: {tuomaValues.length}个{tuomaValues.length === 76 ? '(全拖)' : ''}
          </span>
        )}
      </div>
      {!isTuomaCollapsed && (
        <div>
          <Checkbox.Group
            options={tuomaOptions}
            value={tuomaValues}
            onChange={handleTuomaChange}
            disabled={!isDanmaComplete}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: '8px',
              width: '100%'
            }}
          />
        </div>
      )}

      <div>
        倍数:
        <InputNumber
          style={{ width: 60, marginLeft: 8 }}
          min={1}
          value={multiple}
          size="small"
          onChange={(val) => {
            setMultiple(val)
            // 实时回调给父组件
            onChange &&
              onChange(tuomaValues.length > 0 ? ['快乐8', danmaValues, tuomaValues, val] : null)
          }}
        />
      </div>
    </>
  )
}

HappyEight.propTypes = {
  onChange: PropTypes.func
}

export default HappyEight

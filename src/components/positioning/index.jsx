import { useState, useEffect } from 'react'
import { Checkbox, Space, InputNumber } from 'antd'

const Positioning = ({ onChange = () => {} }) => {
  const numberOptions = Array.from({ length: 10 }, (_, i) => `${i}`)

  const [multiple, setMultiple] = useState(1)
  const [selectedNums, setSelectedNums] = useState([[], [], []])
  useEffect(() => {
    // 检查是否每个位置都至少选择了一个数字
    const isComplete = selectedNums.every((arr) => arr.length > 0)

    if (isComplete) {
      // 如果每个位置都有选择，则调用 onChange 并传递当前选择
      onChange(['定位', ...selectedNums, multiple])
    } else {
      // 如果有任何一个位置是空的，可以选择传递 null 或保持上次有效值
      // 这里我们传递 null 表示当前选择不完整
      onChange(null)
    }
  }, [selectedNums, multiple, onChange])

  const handleChange = (index, values) => {
    setSelectedNums((prev) => {
      const newSelected = [...prev]
      newSelected[index] = values
      return newSelected
    })
  }
  // 渲染每个位置的选中数字和下划线 (总共10个字符)
  const renderSelectedWithUnderscores = (numbers, index) => {
    // 先显示选中的数字 (已排序)
    const selectedDisplay = numbers.map((num) => (
      <span key={`selectedDisplay-${index}-${num}`} style={{ marginRight: '2px' }}>
        {num}
      </span>
    ))

    // 计算需要添加的下划线数量
    const underscoreCount = 10 - numbers.length

    // 创建下划线
    const underscores = Array(underscoreCount)
      .fill(null)
      .map((_, index) => (
        <span key={`underscore-${index}`} style={{ marginRight: '4px' }}>
          -
        </span>
      ))

    // 返回选中数字加下划线
    return (
      <>
        {selectedDisplay}
        {underscores}
      </>
    )
  }
  return (
    <>
      <Space>
        百位:
        <Checkbox.Group
          options={numberOptions}
          defaultValue={['']}
          onChange={(val) => {
            handleChange(0, val)
          }}
        />
      </Space>
      <br />
      <Space>
        十位:
        <Checkbox.Group
          options={numberOptions}
          defaultValue={['']}
          onChange={(val) => {
            handleChange(1, val)
          }}
        />
      </Space>
      <br />
      <Space>
        个位:
        <Checkbox.Group
          options={numberOptions}
          defaultValue={['']}
          onChange={(val) => {
            handleChange(2, val)
          }}
        />
      </Space>
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

export default Positioning

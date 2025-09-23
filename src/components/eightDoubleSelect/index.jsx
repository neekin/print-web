import { useState, useCallback, useRef, useEffect } from 'react'
import { Input, Tag, InputNumber, Typography, Select } from 'antd'

const { Text } = Typography

// 原先固定上限 10 不适用于 "选十复式" (需要到 15)，改为由玩法动态计算
const GLOBAL_MAX_CAP = 30 // 保护性硬上限，防止异常输入
const BACKSPACE_DELETE_INTERVAL = 160



/**
 * 行组件
 */
function TagLine({
  lineIndex,
  tags,
  setTags,
  baseCount,
  setBaseCount,
  firstLineLength,
  hasBlurred,
  markBlurred,
  reportError,
  emitAllChange,
  lineMultiple,
  setLineMultiple,
  minRequired,
  maxAllowed
}) {
  const [inputValue, setInputValue] = useState('')
  const lastDeleteRef = useRef(0)
  const locked = baseCount > 0

  const splitLongNumberString = (str) => {
    const parts = []
    let rest = str
    while (rest.length > 3) {
      parts.push(rest.slice(0, 2))
      rest = rest.slice(2)
    }
    if (rest.length) parts.push(rest)
    return parts
  }

  const validateAndMaybeReport = (lineTags) => {
    const mismatchLock =
      (locked && lineIndex === 0 && lineTags.length !== baseCount) ||
      (locked && lineIndex !== 0 && lineTags.length > 0 && lineTags.length !== baseCount)

    const rangeInvalid =
      typeof minRequired === 'number' && typeof maxAllowed === 'number' &&
      lineTags.length > 0 && (lineTags.length < minRequired || lineTags.length > maxAllowed)

    if ((mismatchLock || rangeInvalid) && (lineIndex === 0 || hasBlurred)) {
      if (rangeInvalid) {
        reportError && reportError({
          type: 'COUNT_RANGE',
          lineIndex,
          expectedRange: [minRequired, maxAllowed],
          actual: lineTags.length,
          message: `第 ${lineIndex + 1} 行数量(${lineTags.length}) 不在允许范围(${minRequired}-${maxAllowed})`
        })
      } else if (mismatchLock) {
        reportError && reportError({
          type: 'COUNT_MISMATCH',
          lineIndex,
          expected: baseCount,
          actual: lineTags.length,
          message: `第 ${lineIndex + 1} 行数量(${lineTags.length}) ≠ 锁定(${baseCount})`
        })
      }
    }
  }

  const tryAddNumberTokens = (raw) => {
    if (!raw) return
    raw = raw.replace(/\s+/g, '')
    if (!/^\d+$/.test(raw)) return
    const pieces = raw.length > 3 ? splitLongNumberString(raw) : [raw]
    const next = [...tags]

    // 动态限制：首行 / 各行都受 maxAllowed 约束 (<= GLOBAL_MAX_CAP)
    let limit
    if (locked) {
      // 锁定后首行还能继续添加到 maxAllowed，其它行受 baseCount（且 baseCount 应该处于范围内）
      limit = lineIndex === 0 ? maxAllowed : baseCount
    } else {
      limit = maxAllowed
    }
    limit = Math.min(limit, GLOBAL_MAX_CAP)
    if (next.length >= limit) return

    for (const p of pieces) {
      if (next.length >= limit) break
      const num = parseInt(p, 10)
      if (!Number.isNaN(num) && num >= 1 && num <= 80 && !next.includes(num)) {
        next.push(num)
      }
    }
    if (next.length === tags.length) return

    // 移除：不再截断首行到 baseCount
    if (locked && lineIndex !== 0 && next.length > baseCount) {
      next.splice(baseCount)
    }

    setTags(lineIndex, next)
    emitAllChange()
    validateAndMaybeReport(next)
  }

  const commitInput = () => {
    if (inputValue.trim()) tryAddNumberTokens(inputValue)
    setInputValue('')
  }

  const removeLastTag = () => {
    if (!tags.length) return
    const now = Date.now()
    if (now - lastDeleteRef.current < BACKSPACE_DELETE_INTERVAL) return
    lastDeleteRef.current = now
    const next = tags.slice(0, -1)
    setTags(lineIndex, next)
    emitAllChange()
    validateAndMaybeReport(next)
  }

  const handleRemoveTag = (val) => {
    const next = tags.filter(t => t !== val)
    setTags(lineIndex, next)
    emitAllChange()
    validateAndMaybeReport(next)
  }

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      commitInput()
    } else if (e.key === 'Backspace' && !inputValue) {
      e.preventDefault()
      removeLastTag()
    }
  }

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').trim()
    if (!text) return
    const segs = text.split(/[\s,，]+/).filter(Boolean)
    for (const s of segs) tryAddNumberTokens(s)
    e.preventDefault()
  }

  // 聚焦第二行锁定
  const handleFocus = () => {
    if (lineIndex === 1 && !locked && firstLineLength > 0) {
      setBaseCount(firstLineLength)
      emitAllChange()
      validateAndMaybeReport(tags)
    }
  }

  const localReachedMax = locked
    ? (lineIndex === 0
        ? tags.length >= maxAllowed
        : tags.length >= baseCount)
    : tags.length >= maxAllowed

  const mismatchLock =
    (locked && lineIndex === 0 && tags.length !== baseCount) ||
    (locked && lineIndex !== 0 && tags.length > 0 && tags.length !== baseCount)

  const rangeInvalid = typeof minRequired === 'number' && typeof maxAllowed === 'number'
    ? (tags.length > 0 && (tags.length < minRequired || tags.length > maxAllowed))
    : false

  const mismatchRaw = mismatchLock || rangeInvalid

  const showMismatch = lineIndex === 0 ? mismatchRaw : (mismatchRaw && hasBlurred)

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: 4,
          border: `1px solid ${showMismatch ? '#ff4d4f' : '#d9d9d9'}`,
          borderRadius: 4,
            cursor: 'text',
          background: showMismatch ? '#fff1f0' : '#fff',
          alignItems: 'center'
        }}
        onClick={() => {
          const el = document.getElementById(`eight-single-select-input-${lineIndex}`)
          el && el.focus()
        }}
      >
        {tags.map(t => (
          <Tag
            key={t}
            closable
            onClose={(e) => {
              e.preventDefault()
              handleRemoveTag(t)
            }}
            style={{ marginInlineEnd: 4 }}
          >
            {t < 10 ? `0${t}` : t}
          </Tag>
        ))}

        <Input
          id={`eight-single-select-input-${lineIndex}`}
          bordered={false}
          style={{ flex: 1, minWidth: 110 }}
          placeholder={(() => {
            const rangeTip = (minRequired && maxAllowed) ? `范围 ${minRequired}-${maxAllowed}` : ''
            if (lineIndex === 0) {
              if (locked) return `锁定基准 ${baseCount} 个 (${rangeTip})`
              if (localReachedMax) return `已达上限 ${maxAllowed}`
              return `输入数字 空格/回车确认 (${rangeTip})`
            } else {
              if (locked) return `需与首行保持 ${baseCount} 个 (${rangeTip})`
              if (firstLineLength > 0) return '聚焦我将锁定'
              return '先输入首行'
            }
          })()}
          value={inputValue}
          onFocus={handleFocus}
          onBlur={() => {
            markBlurred(lineIndex)
            validateAndMaybeReport(tags)
          }}
          onChange={(e) => {
            const v = e.target.value
            if (!/^[\d\s]*$/.test(v)) return
            if (localReachedMax) setInputValue('')
            else setInputValue(v)
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={lineIndex !== 0 && firstLineLength === 0 && !locked}
        />

        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
          <span style={{ fontSize: 12, color: '#555', marginRight: 4 }}>倍数</span>
          <InputNumber
            size="small"
            min={1}
            value={lineMultiple}
            style={{ width: 70 }}
            onChange={(val) => {
              const v = Number(val) || 1
              setLineMultiple(lineIndex, v)
              emitAllChange(true)
            }}
          />
        </div>
      </div>
      {showMismatch && (
        <Text type="danger" style={{ fontSize: 12 }}>
          {rangeInvalid
            ? `数量需在 ${minRequired}-${maxAllowed} 个之间`
            : `数量不一致，应为 ${baseCount} 个`}
        </Text>
      )}
    </div>
  )
}

/**
 * 多行组件
 * 返回：['选X单式', [ [ [nums...], multiple ], ... ]]
 * 需求：倍数不受锁定/错误影响，随时可修改并反映
 */
const EightDoubleSelect = ({
  onChange,
  onError,
  maxLines = 1
}) => {
  const [lines, setLines] = useState(() => Array.from({ length: maxLines }, () => []))
  const [lineMultiples, setLineMultiples] = useState(() =>
    Array.from({ length: maxLines }, () => 1)
  )
  const [baseCount, setBaseCount] = useState(0)
  const [play, setPlay] = useState('选一复式')
  // 玩法对应最小/最大数量映射
  const playRangeMap = {
    '选一复式': [1, 6],
    '选二复式': [2, 7],
    '选三复式': [3, 8],
    '选四复式': [4, 9],
    '选五复式': [5, 10],
    '选六复式': [6, 11],
    '选七复式': [7, 12],
    '选八复式': [8, 13],
    '选九复式': [9, 14],
    '选十复式': [10, 15]
  }
  const currentRange = playRangeMap[play] || null
  const [blurredLines, setBlurredLines] = useState(() => new Set())
  const locked = baseCount > 0

  const reportError = useCallback((err) => {
    onError && onError(err)
  }, [onError])

  const setTagsForLine = (idx, nextTags) => {
    setLines(prev => {
      const copy = [...prev]
      copy[idx] = nextTags
      return copy
    })
  }

  const setLineMultiple = (idx, val) => {
    setLineMultiples(prev => {
      const copy = [...prev]
      copy[idx] = val
      return copy
    })
  }

  const markBlurred = (idx) => {
    setBlurredLines(prev => {
      if (prev.has(idx)) return prev
      const next = new Set(prev)
      next.add(idx)
      return next
    })
  }

  /**
   * 同步逻辑：
   * 锁定后如果首行删除导致长度减少，则自动同步 baseCount = 首行最新长度。
   * 如果首行清空，解除锁定（baseCount=0），并清空其余行。
   * 同步后自动截断其它行超出的号码，避免持续红错。
   */
  useEffect(() => {
    setLines(prev => {
      // 使用函数式更新避免在同一渲染中多次读取过期值
      return prev
    })
  }, [])

  useEffect(() => {
    if (!locked) return
    const firstLen = lines[0].length
    if (firstLen === 0 && baseCount !== 0) {
      // 解锁 & 清空其它行
      setBaseCount(0)
      setLines(prev => prev.map((l, i) => (i === 0 ? [] : [])))
      return
    }
    if (firstLen > 0 && firstLen < baseCount) {
      // 同步下降
      setBaseCount(firstLen)
      setLines(prev =>
        prev.map((l, i) => {
          if (i === 0) return l
          return l.length > firstLen ? l.slice(0, firstLen) : l
        })
      )
    }
  }, [lines, locked, baseCount])

  /**
   * emitAllChange
   * allowEmitWithMismatch: 倍数修改时允许其它行暂存错误并仍输出合法行
   */
  const emitAllChange = useCallback((allowEmitWithMismatch = false) => {
    if (!onChange) return
    const first = lines[0]
    if (!first.length) return

    const eff = locked ? baseCount : first.length
    const firstLineInvalid = locked && first.length !== eff

    const errorLines = []
    if (locked) {
      lines.forEach((l, i) => {
        if (l.length > 0 && l.length !== eff) errorLines.push(i)
      })
    }

    if (errorLines.length) {
      const i = errorLines[0]
      reportError && reportError({
        type: 'COUNT_MISMATCH',
        lineIndex: i,
        expected: eff,
        actual: lines[i].length,
        message: `第 ${i + 1} 行数量(${lines[i].length}) ≠ 基准(${eff})`
      })
    }

    if (firstLineInvalid) return
    if (!allowEmitWithMismatch && errorLines.length) return

    const validLines = lines
      .map((l, idx) => ({ nums: l, mult: lineMultiples[idx] }))
      .filter(item => item.nums.length === eff)

    if (!validLines.length) return


    // 输出仍保留原格式，如需根据玩法调整类型可在此扩展
    const payload = [
      play,
      validLines.map(item => [item.nums, item.mult])
    ]
    onChange(payload)
  }, [lines, lineMultiples, baseCount, locked, onChange, reportError])

  useEffect(() => {
    emitAllChange()
  }, [lines, baseCount, emitAllChange])

  return (
    <div style={{ border: '1px dashed #ddd', padding: 8, borderRadius: 6 }}>
     <Select
          value={play}
          style={{ width: 90, marginRight: 10 }}
          onChange={(e) => {
            setPlay(e)
            // 切换玩法时重置行数据与锁定状态
            setLines(Array.from({ length: maxLines }, () => []))
            setBaseCount(0)
            setBlurredLines(new Set())
           if (onChange) {
              onChange(null) // 或者 onChange([e, []]) 如果你想带上新玩法标识
            }
          }}
          tabIndex={-1}
          options={[
            {
              value: '选一复式',
              label: '选一复式'
            },
            {
              value: '选二复式',
              label: '选二复式'
            },
            {
              value: '选三复式',
              label: '选三复式'
            },
            {
              value: '选四复式',
              label: '选四复式'
            },
            {
              value: '选五复式',
              label: '选五复式'
            },
            {
              value: '选六复式',
              label: '选六复式'
            },
            {
              value: '选七复式',
              label: '选七复式'
            },
            {
              value: '选八复式',
              label: '选八复式'
            },
                       {
              value: '选九复式',
              label: '选九复式'
            },
                       {
              value: '选十复式',
              label: '选十复式'
            }
          ]}
        />
      {lines.map((lineTags, idx) => (
        <TagLine
          key={idx}
          lineIndex={idx}
          tags={lineTags}
          setTags={setTagsForLine}
          baseCount={baseCount}
          setBaseCount={setBaseCount}
          firstLineLength={lines[0].length}
          hasBlurred={blurredLines.has(idx)}
          markBlurred={markBlurred}
          reportError={reportError}
          emitAllChange={emitAllChange}
          lineMultiple={lineMultiples[idx]}
          setLineMultiple={setLineMultiple}
          minRequired={currentRange ? currentRange[0] : undefined}
          maxAllowed={currentRange ? currentRange[1] : 10}
        />
      ))}
      <div style={{ fontSize: 12, color: '#888' }}>
        {locked
          ? `已锁定数量: ${baseCount}（范围 ${currentRange ? currentRange.join('-') : '—'}，首行删减自动同步）`
          : `未锁定，首行当前数量: ${lines[0].length || 0}（允许范围 ${currentRange ? currentRange.join('-') : '—'}，聚焦第二行锁定）`}
      </div>
    </div>
  )
}

export default EightDoubleSelect
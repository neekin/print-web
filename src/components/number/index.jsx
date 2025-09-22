import { Checkbox } from 'antd'

const Numbers = ({ onChange }) => {
  const numberOptions = Array.from({ length: 10 }, (_, i) => `${i }`)

  // const onChange = (checkedValues) => {
  //   console.log('checked numbers:', checkedValues)
  // }

  return (
    <>
      <Checkbox.Group options={numberOptions} onChange={onChange} />
    </>
  )
}

export default Numbers

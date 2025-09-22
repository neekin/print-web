import { useState, useEffect } from 'react'
import { Typography, Button } from 'antd'
const { Paragraph } = Typography
import style from './MachineId.module.scss'
function MachineId({ checkLicenseRequest }) {
  // const [versions] = useState(window.electron.process.versions)
  const [machineId, setMachineId] = useState('')
  const ipcHandle = () => {
    window.electron.ipcRenderer.send('getMachineId')
    window.electron.ipcRenderer.on('machineId', (event, machineId) => {
      setMachineId(machineId)
    })
  }
  useEffect(() => {
    if (!machineId) {
      ipcHandle()
    }
  }, [machineId])
  return (
    <>
      <Paragraph
        copyable={{
          text: `${machineId}`
        }}
      >
        <p className={style.tips}>请复制机器码发送给管理员</p>
        <span className={style.tips}>机器码:{machineId}</span>
      </Paragraph>
      <Button
        type="primary"
        onClick={() => {
          checkLicenseRequest()
        }}
      >
        刷新
      </Button>
    </>
  )
}

export default MachineId

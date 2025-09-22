import { httpRequest } from './httpRequest'

const HEALTH_URL = 'https://armbian.chaofan.live/api/licence/health_check/'
const CREATE_URL = 'https://armbian.chaofan.live/api/licence/create/'

/**
 * 调用健康检查接口
 * 后端历史接口使用字段: machine_code, type
 */
export async function healthCheck(machineCode, type = 1) {
  const body = JSON.stringify({
    machine_code: machineCode,
    type
  })

  const res = await httpRequest({
    url: HEALTH_URL,
    method: 'POST',
    data: body
  })

  // 兼容返回结构（以前判断 message === 'Machine status set to online'）
  const ok = res?.message === 'Machine status set to online' 

  return { ok, raw: res }
}

/**
 * 创建授权后再做一次健康检查
 */
export async function createAndVerify(machineCode, type = 1) {
  const body = JSON.stringify({
    machine_code: machineCode,
    type
  })

  const createRes = await httpRequest({
    url: CREATE_URL,
    method: 'POST',
    data: body
  })

  // 创建成功后再调一次 healthCheck
  const hc = await healthCheck(machineCode, type)
  return {
    created: true,
    createRaw: createRes,
    ok: hc.ok,
    healthRaw: hc.raw
  }
}
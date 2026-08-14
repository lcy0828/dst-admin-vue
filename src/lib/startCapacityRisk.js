import { roomApi, systemApi } from '@/api/index'
import { confirmCapacityRisk } from '@/lib/feedback'
import {
  CAPACITY_RISK_CONFIRMATION_CANCELED,
  isCapacityRiskError,
} from '@/lib/capacityRisk.mjs'

class CapacityRiskCanceledError extends Error {
  constructor() {
    super('Capacity risk confirmation was canceled.')
    this.name = 'CapacityRiskCanceledError'
    this.code = CAPACITY_RISK_CONFIRMATION_CANCELED
  }
}

async function executeWithCapacityConfirmation(execute) {
  try {
    return await execute(false)
  } catch (error) {
    if (!isCapacityRiskError(error)) throw error
    try {
      await confirmCapacityRisk(error.details)
    } catch {
      throw new CapacityRiskCanceledError()
    }
    return execute(true)
  }
}

export function startRoomWithCapacityRisk(input) {
  return executeWithCapacityConfirmation(allowCapacityRisk => roomApi.startRoom({
    ...input,
    allow_capacity_risk: allowCapacityRisk,
  }))
}

export function restartWorldWithCapacityRisk(input) {
  return executeWithCapacityConfirmation(allowCapacityRisk => systemApi.restartTmuxServer({
    ...input,
    allow_capacity_risk: allowCapacityRisk,
  }))
}

export function isCapacityRiskCanceled(error) {
  return error?.code === CAPACITY_RISK_CONFIRMATION_CANCELED
}

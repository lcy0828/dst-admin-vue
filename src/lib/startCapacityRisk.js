import { roomApi } from '@/api/index'
import { confirmCapacityRisk, selectRuntimeMode } from '@/lib/feedback'
import {
  isCapacityRiskError,
} from '@/lib/capacityRisk.mjs'

const START_FLOW_CANCELED = 'START_FLOW_CANCELED'

class StartFlowCanceledError extends Error {
  constructor() {
    super('Room startup was canceled.')
    this.name = 'StartFlowCanceledError'
    this.code = START_FLOW_CANCELED
  }
}

export async function executeWithCapacityConfirmation(execute) {
  try {
    return await execute(false)
  } catch (error) {
    if (!isCapacityRiskError(error)) throw error
    try {
      await confirmCapacityRisk(error.details)
    } catch {
      throw new StartFlowCanceledError()
    }
    return execute(true)
  }
}

async function chooseRuntimeSelection(input) {
  const requested = input?.runtime_mode || input?.runtimeMode
  if (requested) {
    return {
      mode: requested,
      version: input?.runtime_version || input?.runtimeVersion || (requested === 'game' ? 'game' : ''),
    }
  }

  const response = await roomApi.getRuntimeModes(input)
  const availability = response?.data || response || {}

  try {
    const result = await selectRuntimeMode(availability)
    return {
      mode: result?.value || 'game',
      version: result?.version || (result?.value === 'game' ? 'game' : ''),
    }
  } catch {
    throw new StartFlowCanceledError()
  }
}

export async function startRoomWithCapacityRisk(input) {
  const runtimeSelection = await chooseRuntimeSelection(input)
  return executeWithCapacityConfirmation(allowCapacityRisk => roomApi.startRoom({
    ...input,
    allow_capacity_risk: allowCapacityRisk,
    runtime_mode: runtimeSelection.mode,
    runtime_version: runtimeSelection.version,
  }))
}

export function restartWorldWithCapacityRisk(input) {
  return executeWithCapacityConfirmation(allowCapacityRisk => roomApi.restartRoom({
    ...input,
    allow_capacity_risk: allowCapacityRisk,
  }))
}

export function isCapacityRiskCanceled(error) {
  return error?.code === START_FLOW_CANCELED
}

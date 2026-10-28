import { roomApi } from '@/api/index'
import { confirmCapacityRisk, selectRuntimeMode } from '@/lib/feedback'
import { resolveRuntimeSelection } from '@/lib/runtimeModeInheritance.mjs'
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
  try {
    return await resolveRuntimeSelection(input, value => roomApi.getRuntimeModes(value), availability => selectRuntimeMode(availability))
  } catch (error) {
    if (error === 'cancel') throw new StartFlowCanceledError()
    throw error
  }
}

export async function startRoomWithCapacityRisk(input) {
  const runtimeSelection = await chooseRuntimeSelection(input)
  return executeWithCapacityConfirmation(allowCapacityRisk => roomApi.startRoom({
    ...input,
    allow_capacity_risk: allowCapacityRisk,
    ...runtimeSelection,
  }))
}

export async function restartWorldWithCapacityRisk(input) {
  const runtimeSelection = await chooseRuntimeSelection(input)
  return executeWithCapacityConfirmation(allowCapacityRisk => roomApi.restartRoom({
    ...input,
    ...runtimeSelection,
    allow_capacity_risk: allowCapacityRisk,
  }))
}

export function isCapacityRiskCanceled(error) {
  return error?.code === START_FLOW_CANCELED
}

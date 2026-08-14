export const CAPACITY_RISK_CONFIRMATION_REQUIRED = 'CAPACITY_RISK_CONFIRMATION_REQUIRED'
export const CAPACITY_RISK_CONFIRMATION_CANCELED = 'CAPACITY_RISK_CONFIRMATION_CANCELED'

export function isCapacityRiskError(error) {
  return error?.code === CAPACITY_RISK_CONFIRMATION_REQUIRED && Boolean(error?.details)
}

export function capacityRiskTargets(preview) {
  return Array.isArray(preview?.targets) ? preview.targets : []
}

export function capacityRiskLimit(target) {
  const limit = Number(target?.capacity?.recommendedShardLimit)
  return Number.isFinite(limit) && limit > 0 ? limit : null
}

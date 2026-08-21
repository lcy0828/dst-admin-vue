export const FLEET_ROLES = Object.freeze({
  STANDALONE: 'standalone',
  CONTROLLER_WORKER: 'controller_worker',
  MANAGED_WORKER: 'managed_worker',
  CONTROLLER_ONLY: 'controller_only'
})

const ROLE_FLAGS = Object.freeze({
  [FLEET_ROLES.STANDALONE]: Object.freeze({
    localExecutorEnabled: true,
    controllerEnabled: false,
    memberEnabled: false
  }),
  [FLEET_ROLES.CONTROLLER_WORKER]: Object.freeze({
    localExecutorEnabled: true,
    controllerEnabled: true,
    memberEnabled: false
  }),
  [FLEET_ROLES.MANAGED_WORKER]: Object.freeze({
    localExecutorEnabled: true,
    controllerEnabled: false,
    memberEnabled: true
  }),
  [FLEET_ROLES.CONTROLLER_ONLY]: Object.freeze({
    localExecutorEnabled: false,
    controllerEnabled: true,
    memberEnabled: false
  })
})

export function fleetFlagsForRole(role) {
  return { ...(ROLE_FLAGS[role] || ROLE_FLAGS[FLEET_ROLES.STANDALONE]) }
}

export function fleetRoleFromFlags(flags = {}) {
  if (flags.memberEnabled === true) return FLEET_ROLES.MANAGED_WORKER
  if (flags.controllerEnabled === true && flags.localExecutorEnabled === false) {
    return FLEET_ROLES.CONTROLLER_ONLY
  }
  if (flags.controllerEnabled === true) return FLEET_ROLES.CONTROLLER_WORKER
  return FLEET_ROLES.STANDALONE
}

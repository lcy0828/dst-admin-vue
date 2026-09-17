const MASTER_ROLES = new Set(['master'])

export function egressProbeRegion(locale) {
  const value = typeof locale === 'string' ? locale : locale?.value
  return String(value || '').toLowerCase().startsWith('zh') ? 'cn' : 'global'
}

function normalizePort(value) {
  const port = Number(value)
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null
}

function normalizeAddress(value) {
  return String(value || '').trim().replace(/^\[|\]$/g, '')
}

function parseIPv4(value) {
  const match = normalizeAddress(value).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!match) return null
  const octets = match.slice(1).map(Number)
  return octets.every(octet => octet >= 0 && octet <= 255) ? octets : null
}

function isPrivateIPv4(value) {
  const octets = parseIPv4(value)
  if (!octets) return false
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
}

export function privateIPv4Addresses(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(normalizeAddress)
    .filter(isPrivateIPv4))]
    .sort((left, right) => {
      const leftValue = parseIPv4(left).reduce((total, octet) => total * 256 + octet, 0)
      const rightValue = parseIPv4(right).reduce((total, octet) => total * 256 + octet, 0)
      return leftValue - rightValue
    })
}

function isLoopbackAddress(value) {
  const address = normalizeAddress(value).toLowerCase()
  return address === 'localhost' || address === '::1' || address.startsWith('127.')
}

function isUsableAddress(value) {
  const address = normalizeAddress(value).toLowerCase()
  return Boolean(address) && address !== '0.0.0.0' && address !== '::'
}

function worldRole(world) {
  return String(world?.role || world?.worldRole || '').trim().toLowerCase()
}

export function findMasterWorld(worlds = []) {
  return worlds.find(world => world?.isMaster === true)
    || worlds.find(world => world?.isMaster !== false && MASTER_ROLES.has(worldRole(world)))
    || worlds.find(world => world?.isMaster !== false && String(world?.directoryName || '').trim().toLowerCase() === 'master')
    || null
}

function placementForWorld(topology, worldId) {
  return (topology?.placements || []).find(placement => String(placement.worldId) === String(worldId)) || null
}

function targetForWorld(world, placement) {
  const placedTarget = normalizeAddress(placement?.appliedTargetId || placement?.desiredTargetId)
  if (placedTarget) return placedTarget
  const catalogTargets = [...new Set((Array.isArray(world?.targetIds) ? world.targetIds : [])
    .map(normalizeAddress)
    .filter(Boolean))]
  return catalogTargets.length === 1 ? catalogTargets[0] : ''
}

function environmentForTarget(infrastructure, targetId) {
  return (infrastructure?.environments || []).find(environment => String(environment.targetId) === String(targetId)) || null
}

function providerForTarget(infrastructure, targetId) {
  return (infrastructure?.providers || []).find(provider => String(provider.targetId) === String(targetId)) || null
}

function profileForEnvironment(infrastructure, environment) {
  if (!environment) return null
  return (infrastructure?.networkProfiles || []).find(profile =>
    String(profile.id) === String(environment.networkProfileId)
      || String(profile.environmentId) === String(environment.id)
  ) || null
}

export function worldListenPort({ roomId, world, topology, infrastructure } = {}) {
  if (!world) return null
  const placement = placementForWorld(topology, world.id)
  const targetId = targetForWorld(world, placement)
  const reservation = (infrastructure?.portReservations || []).find(item =>
    String(item.roomId) === String(roomId)
      && String(item.worldId) === String(world.id)
      && item.purpose === 'dst_server'
      && item.state !== 'released'
      && (!targetId || String(item.targetId) === String(targetId))
  )
  return normalizePort(reservation?.port) || normalizePort(world.serverPort)
}

export function formatConnectionEndpoint(address, port) {
  const host = normalizeAddress(address)
  const normalizedPort = normalizePort(port)
  if (!host || !normalizedPort) return ''
  return `${host.includes(':') ? `[${host}]` : host}:${normalizedPort}`
}

function escapeLuaString(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function buildDirectConnectCode(address, port, password = '') {
  const host = normalizeAddress(address)
  const normalizedPort = normalizePort(port)
  if (!host || !normalizedPort) return ''
  const argumentsList = [`"${escapeLuaString(host)}"`, String(normalizedPort)]
  if (password) argumentsList.push(`"${escapeLuaString(password)}"`)
  return `c_connect(${argumentsList.join(', ')})`
}

export function resolveWorldConnection({ room, roomId, world, topology, infrastructure, browserHostname, detectedAddress, draftAddress } = {}) {
  if (!world) {
    return { world: null, address: '', port: null, endpoint: '', addressSource: 'missing', ready: false }
  }

  const placement = placementForWorld(topology, world.id)
  const targetId = targetForWorld(world, placement)
  const environment = environmentForTarget(infrastructure, targetId)
  const provider = providerForTarget(infrastructure, targetId)
  const profile = profileForEnvironment(infrastructure, environment)
  const lanAddresses = privateIPv4Addresses(provider?.ipAddresses)
  const configuredAddress = normalizeAddress(profile?.advertiseAddress)
  const probedAddress = normalizeAddress(detectedAddress)
  const editedAddress = normalizeAddress(draftAddress)
  const remoteTarget = Boolean(targetId) && targetId !== 'local'
  // The panel hostname only identifies the controller. It is never a valid
  // fallback for a Master placed on another Runtime target. A loopback saved
  // on that remote target is also unreachable from the player's machine.
  const fallbackAddress = !targetId || targetId === 'local' ? normalizeAddress(browserHostname) : ''
  const addressIsReachable = address => isUsableAddress(address) && (!remoteTarget || !isLoopbackAddress(address))
  const hasConfiguredAddress = addressIsReachable(configuredAddress)
  const hasProbedAddress = addressIsReachable(probedAddress)
  const hasEditedAddress = addressIsReachable(editedAddress)
  const address = hasEditedAddress
    ? editedAddress
    : (hasConfiguredAddress
        ? configuredAddress
        : (hasProbedAddress ? probedAddress : (isUsableAddress(fallbackAddress) ? fallbackAddress : '')))
  const addressSource = hasEditedAddress
    ? (editedAddress === configuredAddress
        ? 'configured'
        : (editedAddress === probedAddress
            ? 'detected'
            : (lanAddresses.includes(editedAddress) ? 'lan' : 'draft')))
    : (hasConfiguredAddress
        ? 'configured'
        : (hasProbedAddress ? 'detected' : (address ? (isLoopbackAddress(address) ? 'local' : 'panel') : 'missing')))
  const port = worldListenPort({ roomId: roomId || room?.id, world, topology, infrastructure })
  const endpoint = formatConnectionEndpoint(address, port)

  return {
    world,
    targetId,
    provider,
    profile,
    lanAddresses,
    address,
    port,
    endpoint,
    addressSource,
    ready: Boolean(endpoint)
  }
}

export function resolveRoomConnection(options = {}) {
  const world = findMasterWorld(options.room?.worlds || [])
  return resolveWorldConnection({ ...options, world })
}
